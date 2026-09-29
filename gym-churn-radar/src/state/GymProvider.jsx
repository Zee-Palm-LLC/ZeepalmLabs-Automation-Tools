import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGym, postAction, PUBLIC_DEMO } from '../lib/api.js';
import { todayKey } from '../lib/format.js';

const GymContext = createContext(null);

export function useGym() {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error('useGym must be used inside GymProvider');
  return ctx;
}

let toastId = 0;

export function GymProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [scan, setScan] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [selectedRef, setSelectedRef] = useState(null);
  const timer = useRef(null);
  const busyRef = useRef(null);
  busyRef.current = busy;

  const toast = useCallback((message, tone = 'neutral') => {
    const id = ++toastId;
    setToasts(list => [...list, { id, message, tone }]);
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback(id => setToasts(list => list.filter(t => t.id !== id)), []);

  const refresh = useCallback(async () => {
    const next = await fetchGym();
    setData(next);
    setStatus('ready');
    setError('');
    return next;
  }, []);

  const load = useCallback(() => {
    setStatus(s => (s === 'ready' ? s : 'loading'));
    refresh().catch(e => {
      setError(e.message);
      setStatus(s => (s === 'ready' ? s : 'error'));
    });
  }, [refresh]);

  useEffect(() => {
    load();
    const every = setInterval(() => {
      if (!busyRef.current && document.visibilityState === 'visible') refresh().catch(() => {});
    }, 60000);
    return () => {
      clearInterval(every);
      clearTimeout(timer.current);
    };
  }, [load, refresh]);

  const runScan = useCallback(async () => {
    if (busyRef.current) return;
    setBusy('scan');
    const startedAt = Date.now();
    const startEmails = data ? data.stats.emailsTotal90Days : 0;
    setScan({ phase: 'scoring', sent: 0, startedAt });
    try {
      await postAction('scan');
    } catch (e) {
      setBusy(null);
      setScan(null);
      toast('Could not start the scan: ' + e.message, 'error');
      return;
    }
    let scored = false;
    let quiet = 0;
    let lastCount = startEmails;
    const tick = async () => {
      try {
        const next = await refresh();
        const fresh = next.lastScanAt && new Date(next.lastScanAt).getTime() >= startedAt - 5000;
        const sent = Math.max(0, next.stats.emailsTotal90Days - startEmails);
        if (fresh) scored = true;
        quiet = next.stats.emailsTotal90Days === lastCount ? quiet + 1 : 0;
        lastCount = next.stats.emailsTotal90Days;
        const elapsed = Date.now() - startedAt;
        const settled = sent > 0 ? quiet >= 3 : elapsed > (PUBLIC_DEMO ? 9000 : 150000);
        if ((scored && settled) || elapsed > 300000) {
          setBusy(null);
          setScan(null);
          toast(scored
            ? 'Scan complete: ' + next.stats.highRisk + ' high-risk members, ' + (sent ? sent + (PUBLIC_DEMO ? ' win-back emails written (the demo never sends them)' : ' win-back emails sent') : 'no new emails needed today')
            : 'The scan is still running in n8n. The board updates when it finishes.', scored ? 'success' : 'neutral');
          return;
        }
        setScan({ phase: scored ? 'writing' : 'scoring', sent, startedAt });
      } catch (e) {
        setScan(s => (s ? { ...s, phase: 'retrying' } : s));
      }
      timer.current = setTimeout(tick, 3000);
    };
    timer.current = setTimeout(tick, 2500);
  }, [data, refresh, toast]);

  const resetDemo = useCallback(async () => {
    if (busyRef.current) return;
    setBusy('reset');
    const before = data ? data.members.map(m => m.joinDate).join() : '';
    try {
      await postAction('reset');
    } catch (e) {
      setBusy(null);
      toast('Could not reset: ' + e.message, 'error');
      return;
    }
    const startedAt = Date.now();
    const tick = async () => {
      try {
        const next = await fetchGym();
        const after = next.members.map(m => m.joinDate).join();
        if (((PUBLIC_DEMO || after !== before) && next.members.length >= 40 && next.trend.some(p => p.count > 0)) || Date.now() - startedAt > 40000) {
          setData(next);
          setBusy(null);
          toast('Fresh demo gym ready. Run a scan to see who is slipping away.', 'success');
          return;
        }
      } catch {
        setBusy('reset');
      }
      timer.current = setTimeout(tick, 2000);
    };
    timer.current = setTimeout(tick, PUBLIC_DEMO ? 600 : 3000);
  }, [data, toast]);

  const patchMember = useCallback((ref, patch) => {
    setData(d => (d ? { ...d, members: d.members.map(m => (m.ref === ref ? { ...m, ...patch(m) } : m)) } : d));
  }, []);

  const checkIn = useCallback(async member => {
    const key = todayKey();
    patchMember(member.ref, m => ({ recentVisits: m.recentVisits.includes(key) ? m.recentVisits : [...m.recentVisits, key], daysSinceVisit: 0 }));
    try {
      await postAction('checkin', { member: member.ref });
      toast(member.name + ' checked in', 'success');
      setTimeout(() => refresh().catch(() => {}), 1200);
    } catch (e) {
      toast('Check-in failed: ' + e.message, 'error');
      refresh().catch(() => {});
    }
  }, [patchMember, refresh, toast]);

  const changeStatus = useCallback(async (member, nextStatus) => {
    const before = member.status;
    patchMember(member.ref, () => ({ status: nextStatus }));
    try {
      await postAction('status', { member: member.ref, status: nextStatus });
      const verb = nextStatus === 'active' ? 'reactivated' : nextStatus === 'frozen' ? 'frozen' : 'cancelled';
      toast(member.name + ' ' + verb, 'success');
      setTimeout(() => refresh().catch(() => {}), 1200);
    } catch (e) {
      patchMember(member.ref, () => ({ status: before }));
      toast('Could not update ' + member.name + ': ' + e.message, 'error');
    }
  }, [patchMember, refresh, toast]);

  const saveSettings = useCallback(async values => {
    await postAction('settings', values);
    await refresh();
    toast('Settings saved. They apply from the next scan.', 'success');
  }, [refresh, toast]);

  const openMember = useCallback(ref => setSelectedRef(ref), []);
  const closeMember = useCallback(() => setSelectedRef(null), []);
  const selected = data && selectedRef ? data.members.find(m => m.ref === selectedRef) || null : null;

  const value = useMemo(() => ({
    data, status, error, busy, scan, toasts, selected,
    load, refresh, runScan, resetDemo, checkIn, changeStatus, saveSettings, toast, dismissToast, openMember, closeMember
  }), [data, status, error, busy, scan, toasts, selected, load, refresh, runScan, resetDemo, checkIn, changeStatus, saveSettings, toast, dismissToast, openMember, closeMember]);

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}
