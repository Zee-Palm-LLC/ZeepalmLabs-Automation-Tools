import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CaretLeft, ArrowUp, CellSignalFull, WifiHigh, BatteryFull, ChatCircleDots, Play, HandPointing, ArrowCounterClockwise, CheckCircle, Tooth } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { SCENARIOS } from '../demo/scenarios.js';
import { phone as fmtPhone, clock } from '../lib/format.js';

export default function Phone() {
  const { sim, data, now, visible, typing } = useDesk();
  const patient = sim.patientId ? data.patients.find(p => p.id === sim.patientId) : null;
  const msgs = patient ? visible(patient.id).filter(m => m.dir !== 'note') : [];
  const first = msgs.find(m => m.dir === 'out');

  return (
    <div className="phone" aria-label="Demo phone">
      <div className="phone-screen">
        <StatusBar dark={sim.phase === 'waiting'} now={now} />
        <AnimatePresence initial={false}>
          {sim.phase === 'pick' && <Screen key="pick"><Picker /></Screen>}
          {sim.phase === 'waiting' && <Screen key="lock"><Lock first={first} now={now} /></Screen>}
          {sim.phase === 'thread' && patient && <Screen key="thread"><Thread patient={patient} msgs={msgs} typing={typing(patient.id)} /></Screen>}
        </AnimatePresence>
        <div className="phone-home" aria-hidden="true" />
      </div>
    </div>
  );
}

function Screen({ children }) {
  return (
    <motion.div className="phone-view" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

function StatusBar({ dark, now }) {
  return (
    <div className={'phone-status' + (dark ? ' on-dark' : '')}>
      <span>{new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/, '')}</span>
      <span className="phone-island" aria-hidden="true" />
      <span className="phone-glyphs" aria-hidden="true"><CellSignalFull size={14} weight="fill" /><WifiHigh size={14} weight="bold" /><BatteryFull size={18} weight="fill" /></span>
    </div>
  );
}

function Picker() {
  const { sim, setSim, startDemo, busy } = useDesk();
  const [starting, setStarting] = useState(false);
  const sc = SCENARIOS.find(x => x.key === sim.scenario) || SCENARIOS[0];
  const go = async () => {
    if (starting) return;
    setStarting(true);
    await startDemo(sc.key);
    setStarting(false);
  };
  return (
    <div className="picker">
      <div className="picker-head">
        <span className="picker-icon"><Tooth size={22} weight="fill" /></span>
        <strong>You're a patient</strong>
        <span>Pick how you'll answer the clinic's text</span>
      </div>
      <div className="picker-list" role="radiogroup" aria-label="Patient story">
        {SCENARIOS.map(x => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={sim.scenario === x.key}
            className={'pick-row' + (sim.scenario === x.key ? ' on' : '')}
            onClick={() => setSim(s => ({ ...s, scenario: x.key }))}
          >
            <i aria-hidden="true" />
            <span>
              <strong>{x.label}</strong>
              <em>{x.blurb}</em>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="picker-go" onClick={go} disabled={starting || busy}>
        <Play size={15} weight="fill" />
        {sc.key === 'waitlist' ? 'Join the waitlist' : 'Send me the reminder'}
      </button>
    </div>
  );
}

function Lock({ first, now }) {
  const { data, setSim } = useDesk();
  useEffect(() => {
    if (!first) return undefined;
    const t = setTimeout(() => setSim(x => (x.phase === 'waiting' ? { ...x, phase: 'thread' } : x)), 1900);
    return () => clearTimeout(t);
  }, [first ? first.id : null, setSim]);
  const d = new Date(now);
  return (
    <div className="lock">
      <div className="lock-clock">
        <span>{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <strong>{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/, '')}</strong>
      </div>
      <AnimatePresence>
        {first && (
          <motion.button
            type="button"
            className="notif"
            initial={{ y: -40, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={() => setSim(x => ({ ...x, phase: 'thread' }))}
          >
            <span className="notif-app"><ChatCircleDots size={18} weight="fill" /></span>
            <span className="notif-body">
              <span className="notif-head"><strong>{data.settings.shortName}</strong><em>now</em></span>
              <span className="notif-text">{first.body}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      {!first && <p className="lock-wait">Waiting for a text from the clinic</p>}
    </div>
  );
}

function chipsFor(last) {
  if (!last) return [];
  if (last.kind === 'offer') return ['YES', 'No thanks'];
  if (/Reply 1/.test(last.body)) return /1, 2 or 3/.test(last.body) ? ['1', '2', '3'] : /1 or 2/.test(last.body) ? ['1', '2'] : ['1'];
  if (/What day and time/.test(last.body)) return ['Friday morning', 'Next week, afternoons', 'Anything after 3'];
  return ['C', 'R', 'Can we do next week instead?', 'Do you take Aetna?', 'Running 10 min late'];
}

function Thread({ patient, msgs, typing }) {
  const { data, sim, setSim, sendSms, endSim } = useDesk();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [autoTyping, setAutoTyping] = useState(false);
  const scroller = useRef(null);
  const sent = msgs.filter(m => m.dir === 'in').length;
  const auto = sim.auto && sim.lines.length > 0;
  const last = msgs[msgs.length - 1];
  const lastOut = last && last.dir === 'out';
  const line = auto ? sim.lines[sent] : null;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, typing, draft]);

  const send = async text => {
    const body = (text ?? draft).trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      await sendSms(body);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!auto || typing || sending || autoTyping || !lastOut || !line) return undefined;
    let i = 0;
    let cancelled = false;
    let t = setTimeout(function step() {
      if (cancelled) return;
      setAutoTyping(true);
      i += 1;
      setDraft(line.slice(0, i));
      if (i < line.length) t = setTimeout(step, 30 + Math.random() * 30);
      else t = setTimeout(async () => {
        if (cancelled) return;
        await send(line);
        setAutoTyping(false);
      }, 380);
    }, 1300);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setAutoTyping(false);
    };
  }, [auto, typing, sending, lastOut, line, msgs.length]);

  const finished = auto && !line && !typing && !sending && !autoTyping && lastOut && sent > 0;
  const chips = !auto && !typing && lastOut ? chipsFor(last) : [];
  const took = finished ? Math.max(1, Math.round((Date.parse(last.at) - sim.startedAt) / 1000)) : 0;
  const s = data.settings;
  const resultText = () => {
    const a = data.appts.filter(x => x.patientId === patient.id && (x.status === 'confirmed' || x.status === 'booked')).sort((x, y) => Date.parse(y.bookedAt) - Date.parse(x.bookedAt))[0];
    if (patient.flag && !patient.flag.ack && patient.flag.kind === 'clinical') return 'Handed to the clinical team';
    if (a && a.source === 'waitlist') return 'Booked from the waitlist in ' + took + 's';
    if (a && a.movedFrom) return 'Rescheduled in ' + took + 's';
    if (a && a.confirmedAt) return 'Confirmed in ' + took + 's';
    return 'Conversation finished';
  };

  return (
    <div className="thread">
      <div className="thread-head">
        <button type="button" className="thread-back" onClick={endSim} aria-label="Start over"><CaretLeft size={20} weight="bold" /></button>
        <div className="avatar-sm"><Tooth size={15} weight="fill" /></div>
        <div className="thread-who"><strong>{s.shortName}</strong><span>{fmtPhone(s.clinicPhone)}</span></div>
      </div>
      <div className="thread-body" ref={scroller}>
        <p className="thread-day">Today {clock(msgs[0] ? msgs[0].at : Date.now())}</p>
        <AnimatePresence initial={false}>
          {msgs.map(m => (
            <motion.div
              key={m.id}
              layout="position"
              className={'bubble ' + (m.dir === 'in' ? 'me' : 'them')}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {m.body}
            </motion.div>
          ))}
          {typing && (
            <motion.div key="typing" className="bubble them dots" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-label={s.shortName + ' is typing'}>
              <i /><i /><i />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {finished ? (
        <div className="autoplay is-done">
          <span><CheckCircle size={14} weight="fill" /> {resultText()}</span>
          <button type="button" onClick={endSim}><ArrowCounterClockwise size={13} weight="bold" /> Again</button>
        </div>
      ) : auto ? (
        <div className="autoplay">
          <span><Play size={12} weight="fill" /> Playing: {(SCENARIOS.find(x => x.key === sim.scenario) || {}).label}</span>
          <button type="button" onClick={() => { setSim(x => ({ ...x, auto: false })); setDraft(''); }}><HandPointing size={14} weight="bold" /> Let me type</button>
        </div>
      ) : chips.length > 0 && (
        <div className="chips" role="list">
          {chips.map(c => <button key={c} type="button" role="listitem" onClick={() => send(c)} disabled={sending}>{c}</button>)}
        </div>
      )}
      <form className="composer" onSubmit={e => { e.preventDefault(); if (!auto) send(); }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Text message" aria-label="Your reply" readOnly={auto} maxLength={320} />
        <button type="submit" disabled={!draft.trim() || sending || auto} aria-label="Send"><ArrowUp size={16} weight="bold" /></button>
      </form>
    </div>
  );
}
