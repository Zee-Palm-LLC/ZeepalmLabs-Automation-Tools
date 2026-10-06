import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCare, postAction, PUBLIC_DEMO } from '../lib/api.js';
import { setZone } from '../demo/engine.js';

const CareContext = createContext(null);

export function useCare() {
  const ctx = useContext(CareContext);
  if (!ctx) throw new Error('useCare must be used inside CareProvider');
  return ctx;
}

const IDLE = { phase: 'pick', scenario: 'quiet', personId: null, memberId: null, phone: null, memberPhone: null, doseId: null, steps: [], since: null, startedAt: null, auto: true };
let toastId = 0;

export function CareProvider({ children }) {
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
    const next = await fetchCare();
    setZone(next.settings.timezone);
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
    const tick = setInterval(() => setNow(Date.now()), fast ? 350 : 10000);
    const every = PUBLIC_DEMO ? (fast ? 900 : 15000) : fast ? 2500 : 30000;
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    }, every);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
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
      setSim({ ...IDLE, phase: 'running', scenario, personId: res.personId, memberId: res.memberId, phone: res.phone, memberPhone: res.memberPhone, doseId: res.doseId, steps: res.steps || [], since: res.since, startedAt: Date.now(), auto: scenario !== 'own' });
    } catch (e) {
      toast(e.message, 'bad');
    }
  }, [refresh, toast]);

  const sendAs = useCallback(async (who, body) => {
    const s = simRef.current;
    const phone = who === 'member' ? s.memberPhone : s.phone;
    if (!phone || !body.trim()) return;
    await act('sms', { phone, body: body.trim() });
  }, [act]);

  const endSim = useCallback(() => setSim(s => ({ ...IDLE, scenario: s.scenario })), []);

  const visible = useCallback((thread, since = 0) => (data ? data.messages.filter(m => m.thread === thread && m.dir !== 'note' && Date.parse(m.at) <= now && Date.parse(m.at) >= since) : []), [data, now]);
  const typing = useCallback(thread => (data ? data.messages.some(m => m.thread === thread && m.dir === 'out' && Date.parse(m.at) > now && Date.parse(m.at) - now < 4000) : false), [data, now]);

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
    startDemo,
    sendAs,
    endSim,
    visible,
    typing,
    demo: PUBLIC_DEMO
  };

  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}
