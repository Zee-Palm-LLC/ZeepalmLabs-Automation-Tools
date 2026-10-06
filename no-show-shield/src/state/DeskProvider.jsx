import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDesk, postAction, PUBLIC_DEMO } from '../lib/api.js';
import { stats } from '../lib/metrics.js';

const DeskContext = createContext(null);

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error('useDesk must be used inside DeskProvider');
  return ctx;
}

const IDLE = { phase: 'pick', scenario: 'reschedule', phone: null, patientId: null, apptId: null, freedId: null, startedAt: null, auto: true, lines: [] };
let toastId = 0;

export function DeskProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [sim, setSim] = useState(IDLE);
  const [busy, setBusy] = useState(false);
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
  }, [load]);

  const pending = useMemo(() => (data ? data.messages.some(m => Date.parse(m.at) > now) : false), [data, now]);
  const queued = data ? data.queued > 0 : false;
  const live = sim.phase !== 'pick';

  useEffect(() => {
    if (!data) return undefined;
    const fast = pending || live || queued;
    const tick = setInterval(() => setNow(Date.now()), fast ? 400 : 15000);
    const every = PUBLIC_DEMO ? (queued ? 900 : null) : fast ? 2500 : 30000;
    const poll = every ? setInterval(() => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    }, every) : null;
    return () => {
      clearInterval(tick);
      if (poll) clearInterval(poll);
    };
  }, [data, pending, live, queued, refresh]);

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

  const startDemo = useCallback(async scenario => {
    try {
      const res = await postAction('start', { scenario });
      await refresh();
      setSim({ ...IDLE, phase: 'waiting', scenario, phone: res.phone, patientId: res.patientId, apptId: res.apptId || null, freedId: res.freedId || null, startedAt: Date.now(), auto: scenario !== 'own', lines: res.lines || [] });
    } catch (e) {
      toast(e.message, 'bad');
    }
  }, [refresh, toast]);

  const sendSms = useCallback(async body => {
    const s = simRef.current;
    if (!s.phone || !body.trim()) return;
    await act('sms', { phone: s.phone, body: body.trim() });
  }, [act]);

  const endSim = useCallback(() => {
    setSim(s => ({ ...IDLE, scenario: s.scenario }));
  }, []);

  const visible = useCallback(patientId => (data ? data.messages.filter(m => m.patientId === patientId && Date.parse(m.at) <= now) : []), [data, now]);
  const typing = useCallback(patientId => (data ? data.messages.some(m => m.patientId === patientId && m.dir === 'out' && Date.parse(m.at) > now && Date.parse(m.at) - now < 4000) : false), [data, now]);

  const minute = Math.floor(now / 30000);
  const st = useMemo(() => (data ? stats(data, now) : null), [data, minute]);

  const value = {
    data,
    stats: st,
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
    startDemo,
    sendSms,
    endSim,
    visible,
    typing,
    demo: PUBLIC_DEMO
  };

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
