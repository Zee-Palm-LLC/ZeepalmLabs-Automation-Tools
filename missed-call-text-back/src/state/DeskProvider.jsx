import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDesk, postAction, PUBLIC_DEMO } from '../lib/api.js';

const DeskContext = createContext(null);

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error('useDesk must be used inside DeskProvider');
  return ctx;
}

const IDLE = { phase: 'dial', scenario: 'drain', phone: null, leadId: null, callAt: null, auto: true };
let toastId = 0;

export function DeskProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [sim, setSim] = useState(IDLE);
  const [busy, setBusy] = useState(false);
  const timers = useRef([]);
  const simRef = useRef(sim);
  simRef.current = sim;

  const toast = useCallback((message, tone = 'neutral') => {
    const id = ++toastId;
    setToasts(list => [...list, { id, message, tone }]);
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    const next = await fetchDesk();
    setData(next);
    setStatus('ready');
    setError('');
    setNow(Date.now());
    return next;
  }, []);

  const load = useCallback(() => {
    refresh().catch(e => {
      setError(e.message);
      setStatus(s => (s === 'ready' ? s : 'error'));
    });
  }, [refresh]);

  useEffect(() => {
    load();
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [load]);

  const pending = useMemo(() => (data ? data.messages.some(m => Date.parse(m.at) > now) : false), [data, now]);
  const live = sim.phase !== 'dial';

  useEffect(() => {
    if (!data) return undefined;
    const fast = pending || live;
    const tick = setInterval(() => setNow(Date.now()), fast ? 400 : 15000);
    const poll = PUBLIC_DEMO ? null : setInterval(() => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    }, fast ? 2500 : 30000);
    return () => {
      clearInterval(tick);
      if (poll) clearInterval(poll);
    };
  }, [data, pending, live, refresh]);

  const act = useCallback(async (action, params = {}, done) => {
    setBusy(true);
    try {
      const res = await postAction(action, params);
      await refresh();
      if (done) toast(done, 'good');
      return res;
    } catch (e) {
      toast(e.message, 'bad');
      throw e;
    } finally {
      setBusy(false);
    }
  }, [refresh, toast]);

  const later = (fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const startCall = useCallback(scenario => {
    if (!data) return;
    const used = new Set(data.leads.map(l => l.phone));
    let phone = null;
    for (let i = 0; i < 400 && !phone; i++) {
      const cand = '+1737555' + String(1000 + Math.floor(Math.random() * 9000));
      if (!used.has(cand)) phone = cand;
    }
    const callAt = Date.now();
    setSim({ phase: 'ringing', scenario, phone, leadId: null, callAt, auto: scenario !== 'own' });
    later(async () => {
      if (simRef.current.phone !== phone) return;
      setSim(s => ({ ...s, phase: 'missed' }));
      try {
        const res = await postAction('call', { phone });
        await refresh();
        setSim(s => (s.phone === phone ? { ...s, leadId: res.leadId, missedAt: Date.now() } : s));
        later(() => setSim(s => (s.phone === phone && s.phase === 'missed' ? { ...s, phase: 'waiting' } : s)), 1500);
      } catch (e) {
        toast(e.message, 'bad');
        setSim(IDLE);
      }
    }, 4200);
  }, [data, refresh, toast]);

  const sendSms = useCallback(async body => {
    const s = simRef.current;
    if (!s.phone || !body.trim()) return;
    await act('sms', { phone: s.phone, body: body.trim() });
  }, [act]);

  const endSim = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSim(s => ({ ...IDLE, scenario: s.scenario }));
  }, []);

  const visible = useCallback(leadId => (data ? data.messages.filter(m => m.leadId === leadId && Date.parse(m.at) <= now) : []), [data, now]);
  const typing = useCallback(leadId => (data ? data.messages.some(m => m.leadId === leadId && m.dir === 'out' && Date.parse(m.at) > now) : false), [data, now]);

  const value = {
    data,
    status,
    error,
    load,
    now,
    busy,
    toasts,
    toast,
    dismissToast: id => setToasts(list => list.filter(t => t.id !== id)),
    act,
    sim,
    setSim,
    startCall,
    sendSms,
    endSim,
    visible,
    typing,
    demo: PUBLIC_DEMO
  };

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
