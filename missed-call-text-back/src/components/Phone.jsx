import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Phone as PhoneIcon, PhoneDisconnect, PhoneX, CaretLeft, ArrowUp, CellSignalFull, WifiHigh, BatteryFull, ChatCircleDots, Play, HandPointing } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { SCENARIOS, nextLine } from '../demo/scenarios.js';
import { phone as fmtPhone, stageOf, suggestions, clock } from '../lib/format.js';

export default function Phone() {
  const { sim, data, now, visible, typing } = useDesk();
  const lead = sim.leadId ? data.leads.find(l => l.id === sim.leadId) : null;
  const msgs = lead ? visible(lead.id).filter(m => m.dir !== 'note') : [];
  const first = msgs.find(m => m.dir === 'out');

  return (
    <div className="phone" aria-label="Demo phone">
      <div className="phone-screen">
        <StatusBar dark={sim.phase === 'ringing' || sim.phase === 'missed' || sim.phase === 'waiting'} now={now} />
        <AnimatePresence initial={false}>
          {sim.phase === 'dial' && <Screen key="dial"><Dialer /></Screen>}
          {(sim.phase === 'ringing' || sim.phase === 'missed') && <Screen key="call"><Calling missed={sim.phase === 'missed'} /></Screen>}
          {sim.phase === 'waiting' && <Screen key="lock"><Lock first={first} now={now} /></Screen>}
          {sim.phase === 'thread' && lead && <Screen key="thread"><Thread lead={lead} msgs={msgs} typing={typing(lead.id)} /></Screen>}
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

function Dialer() {
  const { data, sim, setSim, startCall } = useDesk();
  const s = data.settings;
  return (
    <div className="dialer">
      <div className="dialer-contact">
        <div className="avatar-lg">{initials(s.shortName)}</div>
        <strong>{s.businessName}</strong>
        <span>{fmtPhone(s.businessPhone)}</span>
      </div>
      <div className="dialer-pick">
        <p id="pick-label">What's the problem?</p>
        <div className="pick-grid" role="radiogroup" aria-labelledby="pick-label">
          {SCENARIOS.map(sc => (
            <button
              key={sc.key}
              type="button"
              role="radio"
              aria-checked={sim.scenario === sc.key}
              className={'pick' + (sim.scenario === sc.key ? ' on' : '')}
              onClick={() => setSim(x => ({ ...x, scenario: sc.key }))}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dialer-go">
        <button type="button" className="call-btn" onClick={() => startCall(sim.scenario)} aria-label={'Call ' + s.shortName}>
          <PhoneIcon size={30} weight="fill" />
        </button>
        <span>Call {s.shortName}. Nobody will pick up.</span>
      </div>
    </div>
  );
}

function Calling({ missed }) {
  const { data } = useDesk();
  const s = data.settings;
  return (
    <div className={'calling' + (missed ? ' is-missed' : '')}>
      <div className="calling-top">
        <span className="calling-state">{missed ? 'No answer' : 'ringing'}</span>
        <strong>{s.businessName}</strong>
        <span>{fmtPhone(s.businessPhone)}</span>
      </div>
      <div className="calling-mid">
        {!missed && [0, 1, 2].map(i => (
          <motion.span key={i} className="ring" initial={{ scale: 0.6, opacity: 0.55 }} animate={{ scale: 2.1, opacity: 0 }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }} />
        ))}
        <div className="avatar-xl">{missed ? <PhoneX size={46} weight="fill" /> : initials(s.shortName)}</div>
      </div>
      <div className="calling-bottom">
        <span className="hang"><PhoneDisconnect size={30} weight="fill" /></span>
        <span>{missed ? 'Call ended' : 'Everyone is out on jobs'}</span>
      </div>
    </div>
  );
}

function Lock({ first, now }) {
  const { data, setSim } = useDesk();
  useEffect(() => {
    if (!first) return undefined;
    const t = setTimeout(() => setSim(x => (x.phase === 'waiting' ? { ...x, phase: 'thread' } : x)), 1900);
    return () => clearTimeout(t);
  }, [first, setSim]);
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
      {!first && <p className="lock-wait">Waiting for a text back</p>}
    </div>
  );
}

function Thread({ lead, msgs, typing }) {
  const { data, sim, setSim, sendSms, endSim, now } = useDesk();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [used, setUsed] = useState({ slot: 0 });
  const [autoTyping, setAutoTyping] = useState(false);
  const scroller = useRef(null);
  const scenario = SCENARIOS.find(x => x.key === sim.scenario);
  const stage = stageOf(lead);
  const auto = sim.auto && scenario && !scenario.manual;
  const lastOut = msgs.length && msgs[msgs.length - 1].dir === 'out';

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
    if (!auto || typing || sending || autoTyping || !lastOut) return undefined;
    const line = nextLine(scenario, stage, lead, used);
    if (!line) return undefined;
    const key = stage === 'done' ? 'done' : stage;
    let i = 0;
    let cancelled = false;
    let t = setTimeout(function step() {
      if (cancelled) return;
      setAutoTyping(true);
      i += 1;
      setDraft(line.slice(0, i));
      if (i < line.length) t = setTimeout(step, 28 + Math.random() * 30);
      else t = setTimeout(async () => {
        if (cancelled) return;
        setUsed(u => ({ ...u, [key]: key === 'slot' ? (u.slot || 0) + 1 : true }));
        await send(line);
        setAutoTyping(false);
      }, 380);
    }, 1100);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setAutoTyping(false);
    };
  }, [auto, typing, sending, lastOut, stage, msgs.length]);

  const chips = !auto && !typing ? suggestions(lead, now) : [];
  const finished = auto && !typing && !sending && !autoTyping && lastOut && !nextLine(scenario, stage, lead, used);
  const took = finished && sim.callAt ? Math.round((Date.parse(msgs[msgs.length - 1].at) - sim.callAt) / 1000) : 0;
  const s = data.settings;

  return (
    <div className="thread">
      <div className="thread-head">
        <button type="button" className="thread-back" onClick={endSim} aria-label="Hang up and start over"><CaretLeft size={20} weight="bold" /></button>
        <div className="avatar-sm">{initials(s.shortName)}</div>
        <div className="thread-who"><strong>{s.shortName}</strong><span>{fmtPhone(s.businessPhone)}</span></div>
      </div>
      <div className="thread-body" ref={scroller}>
        <p className="thread-day">Today {clock(msgs[0] ? msgs[0].at : now)}</p>
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
          <span>{lead.status === 'booked' ? 'Booked ' + took + 's after the missed call' : 'Conversation finished'}</span>
          <button type="button" onClick={endSim}><PhoneIcon size={13} weight="fill" /> Call again</button>
        </div>
      ) : auto ? (
        <div className="autoplay">
          <span><Play size={12} weight="fill" /> Playing: {scenario.label}</span>
          <button type="button" onClick={() => { setSim(x => ({ ...x, auto: false })); setDraft(''); }}><HandPointing size={14} weight="bold" /> Let me type</button>
        </div>
      ) : chips.length > 0 && (
        <div className="chips" role="list">
          {chips.map(c => <button key={c} type="button" role="listitem" onClick={() => send(c)} disabled={sending}>{c}</button>)}
        </div>
      )}
      <form className="composer" onSubmit={e => { e.preventDefault(); if (!auto) send(); }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Text message"
          aria-label="Your reply"
          readOnly={auto}
          maxLength={320}
        />
        <button type="submit" disabled={!draft.trim() || sending || auto} aria-label="Send"><ArrowUp size={16} weight="bold" /></button>
      </form>
    </div>
  );
}

export function initials(name) {
  const words = String(name || '').split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const caps = words[0].match(/[A-Z]/g) || [];
    if (caps.length >= 2) return caps.slice(0, 2).join('');
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
