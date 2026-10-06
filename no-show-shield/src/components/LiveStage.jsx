import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X, ShieldCheck, Sparkle, ArrowCounterClockwise, ChatText, ChatCircle, CalendarCheck, ArrowsClockwise, FirstAidKit, CalendarX, ListNumbers, Brain, UserCircle
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import Phone from './Phone.jsx';
import OfferBoard from './OfferBoard.jsx';
import { RiskMeter } from './Risk.jsx';
import { StatusPill } from './ui.jsx';
import { whenLabel, providerOf, typeOf, riskOf, INTENT, displayName } from '../lib/format.js';

const ICONS = {
  reminder: { icon: ChatText, tone: 'blue' },
  offer: { icon: ChatText, tone: 'blue' },
  in: { icon: ChatCircle, tone: 'violet' },
  confirm: { icon: CalendarCheck, tone: 'green' },
  options: { icon: ListNumbers, tone: 'blue' },
  moved: { icon: CalendarCheck, tone: 'green' },
  offered: { icon: ArrowsClockwise, tone: 'cyan' },
  filled: { icon: CalendarCheck, tone: 'green' },
  refilled: { icon: ArrowsClockwise, tone: 'green' },
  flag: { icon: FirstAidKit, tone: 'red' },
  cancelled: { icon: CalendarX, tone: 'amber' },
  other: { icon: ChatCircle, tone: 'violet' },
  late: { icon: ChatCircle, tone: 'quiet' }
};

function relatedOffers(data, sim) {
  if (!sim.patientId) return [];
  const mine = new Set(data.appts.filter(a => a.patientId === sim.patientId).map(a => a.id));
  if (sim.freedId) mine.add(sim.freedId);
  return data.offers.filter(o => mine.has(o.apptId) || o.candidates.some(c => c.patientId === sim.patientId));
}

function useEvents() {
  const { data, sim, now } = useDesk();
  return useMemo(() => {
    if (!sim.patientId || !sim.startedAt) return [];
    const offers = relatedOffers(data, sim);
    const others = new Set();
    offers.forEach(o => o.candidates.forEach(c => others.add(c.patientId)));
    const freed = sim.freedId ? data.appts.find(a => a.id === sim.freedId) : null;
    if (freed) others.add(freed.patientId);
    others.delete(sim.patientId);
    const name = id => {
      const p = data.patients.find(x => x.id === id);
      return p ? displayName(p) : 'A patient';
    };
    const out = [];
    for (const m of data.messages) {
      const t = Date.parse(m.at);
      if (t < sim.startedAt - 500 || t > now) continue;
      const you = m.patientId === sim.patientId;
      if (!you && !others.has(m.patientId)) continue;
      if (you) {
        if (m.dir === 'out' && m.kind === 'reminder') out.push({ id: m.id, at: t, kind: 'reminder', title: 'Reminder texted', detail: 'Day-before reminder. It names the time, not the treatment.' });
        else if (m.dir === 'out' && m.kind === 'offer') out.push({ id: m.id, at: t, kind: 'offer', title: 'Open time offered to you', detail: 'You were first in line on the waitlist' });
        else if (m.dir === 'in') out.push({ id: m.id, at: t, kind: 'in', title: 'You replied', detail: '“' + m.body + '”', tag: m.intent && INTENT[m.intent] ? INTENT[m.intent].label : null });
        else if (m.dir === 'note' && m.kind && ICONS[m.kind]) out.push({ id: m.id, at: t, kind: m.kind, title: noteTitle(m), detail: m.body });
      } else {
        if (m.dir === 'in' && freed && m.patientId === freed.patientId) out.push({ id: m.id, at: t, kind: 'cancelled', title: name(m.patientId) + ' cancelled by text', detail: '“' + m.body + '”' });
        else if (m.dir === 'in') out.push({ id: m.id, at: t, kind: 'in', title: name(m.patientId) + ' replied', detail: '“' + m.body + '”' });
        else if (m.dir === 'note' && m.kind === 'offered') out.push({ id: m.id, at: t, kind: 'offered', title: 'Offered to the waitlist', detail: m.body });
        else if (m.dir === 'note' && m.kind === 'filled') out.push({ id: m.id, at: t, kind: 'filled', title: name(m.patientId) + ' took the open time', detail: m.body.replace('Booked from the waitlist: ', '') });
      }
    }
    return out.sort((a, b) => a.at - b.at);
  }, [data, sim, now]);
}

function noteTitle(m) {
  return {
    confirm: 'Visit confirmed',
    options: 'Open times found',
    moved: 'Visit moved',
    offered: 'Your old time went to the waitlist',
    filled: 'Booked from the waitlist',
    refilled: 'Your old time was refilled',
    flag: 'Flagged for a person',
    cancelled: 'Visit cancelled',
    late: 'Front desk told'
  }[m.kind] || m.body;
}

function Timeline() {
  const { sim } = useDesk();
  const events = useEvents();
  return (
    <div className="tl">
      <span className="stage-label">What happened, in order</span>
      {events.length === 0 ? (
        <ol className="tl-ghost">
          {['The clinic texts a reminder', 'You reply in your own words', 'The AI works out what you meant', 'Your visit is confirmed, moved or flagged', 'A freed time goes to the waitlist'].map((t, i) => (
            <li key={t}><span>{i + 1}</span>{t}</li>
          ))}
        </ol>
      ) : (
        <ol className="tl-list">
          <AnimatePresence initial={false}>
            {events.map(e => {
              const meta = ICONS[e.kind] || ICONS.other;
              const Icon = meta.icon;
              return (
                <motion.li key={e.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <span className={'tl-icon t-' + meta.tone}><Icon size={14} weight="fill" /></span>
                  <div className="tl-text">
                    <strong>{e.title}{e.tag && <em className="tl-tag"><Brain size={11} weight="fill" /> {e.tag}</em>}</strong>
                    {e.detail && <span>{e.detail}</span>}
                  </div>
                  <time>+{Math.max(0, Math.round((e.at - sim.startedAt) / 1000))}s</time>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

function YourVisit() {
  const { data, sim, now } = useDesk();
  const S = data.settings;
  const you = sim.patientId ? data.patients.find(p => p.id === sim.patientId) : null;
  if (!you) {
    return (
      <div className="visit is-empty">
        <UserCircle size={26} weight="duotone" />
        <p>Start on the phone. Your visit, its no-show risk and anything sent to the waitlist show up here, live.</p>
      </div>
    );
  }
  const mine = data.appts.filter(a => a.patientId === you.id).sort((a, b) => Date.parse(b.bookedAt) - Date.parse(a.bookedAt));
  const current = mine.find(a => a.status === 'booked' || a.status === 'confirmed') || mine[0];
  if (!current) {
    const w = data.waitlist.find(x => x.patientId === you.id);
    return (
      <div className="visit">
        <div className="visit-head">
          <span className="visit-name">{displayName(you)}</span>
          <span className="pill pill-wait pill-sm"><i className="pill-dot" />On the waitlist</span>
        </div>
        <p className="visit-when">Waiting for a cleaning</p>
        <p className="visit-sub">{w ? 'Any time, any hygienist. Added ' + Math.round((now - Date.parse(w.addedAt)) / 86400000) + ' days ago.' : ''}</p>
      </div>
    );
  }
  const prev = current.movedFrom ? data.appts.find(a => a.id === current.movedFrom) : null;
  const risk = riskOf(current, you, now, S);
  const flagged = you.flag && !you.flag.ack;
  return (
    <div className="visit">
      <div className="visit-head">
        <span className="visit-name">{displayName(you)}</span>
        <StatusPill appt={current} size="sm" />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <p className="visit-when">{cap(whenLabel(current.start, now))}</p>
          {prev && <p className="visit-was">Was {whenLabel(prev.start, now)}</p>}
          <p className="visit-sub">{typeOf(S, current.type).name} with {providerOf(S, current.provider).name}</p>
        </motion.div>
      </AnimatePresence>
      {flagged && (
        <motion.div className="visit-flag" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <FirstAidKit size={16} weight="fill" />
          <span>Clinical team alerted. The AI gave no medical advice.</span>
        </motion.div>
      )}
      <RiskMeter risk={risk} />
    </div>
  );
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function LiveStage({ inOverlay = false }) {
  const { data, sim, demo, endSim, now } = useDesk();
  const s = data.settings;
  const offers = relatedOffers(data, sim).filter(o => Date.parse(o.sentAt) <= now + 400).sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  return (
    <div className={'stage' + (inOverlay ? ' in-overlay' : '')}>
      <div className="stage-glow" aria-hidden="true" />
      <div className="stage-grid">
        <div className="stage-col stage-left">
          <div className="stage-intro">
            <span className="eyebrow-chip"><Sparkle size={13} weight="fill" /> {sim.phase === 'pick' ? 'Try it yourself' : 'Running now'}</span>
            <h2>Fewer empty chairs, without more phone calls.</h2>
            <p>You're a patient of {s.shortName}. Reply to the reminder the way you would in real life, and watch the clinic side handle it.</p>
          </div>
          <Timeline />
        </div>
        <div className="stage-phone">
          <Phone />
          {sim.phase !== 'pick' && (
            <button type="button" className="btn btn-ghost btn-sm stage-restart" onClick={endSim}><ArrowCounterClockwise size={14} weight="bold" /> Start over</button>
          )}
        </div>
        <div className="stage-col stage-right">
          <span className="stage-label">Clinic view</span>
          <YourVisit />
          <AnimatePresence>
            {offers[0] && (
              <motion.div key={offers[0].id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="stage-offer">
                <span className="stage-label">Waitlist backfill</span>
                <OfferBoard offer={offers[0]} compact />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="stage-note">
            <ShieldCheck size={18} weight="duotone" />
            <p>
              {!s.aiEnabled
                ? 'AI replies are paused, so texts wait for the front desk. Turn them back on in the sidebar.'
                : demo
                  ? 'Nothing is sent and every patient is made up. This demo runs in your browser with a scripted stand-in for Claude, so it costs nothing to run.'
                  : 'Replies come from Claude through your n8n workspace. Demo mode keeps real texts from being sent.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StageOverlay() {
  const { stageOpen, setStageOpen } = useUi();
  const { data } = useDesk();

  useEffect(() => {
    if (!stageOpen) return undefined;
    const onKey = e => e.key === 'Escape' && setStageOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [stageOpen, setStageOpen]);

  return (
    <AnimatePresence>
      {stageOpen && data && (
        <motion.div className="overlay stage-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div
            className="stage-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Live demo"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <button type="button" className="icon-btn stage-close" onClick={() => setStageOpen(false)} aria-label="Close the live demo"><X size={20} /></button>
            <LiveStage inOverlay />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
