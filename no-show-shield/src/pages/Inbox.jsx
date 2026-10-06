import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  MagnifyingGlass, Phone as PhoneIcon, Robot, HandPalm, PaperPlaneRight, CaretLeft, ChatsCircle, Check, FirstAidKit, CalendarCheck,
  Sparkle, Copy, SidebarSimple, Info, Brain, ArrowsClockwise, CalendarX, ListNumbers, Bell
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Segmented, Avatar, Empty, StatusPill } from '../components/ui.jsx';
import { RiskMeter } from '../components/Risk.jsx';
import { phone, ago, clock, displayName, needsYou, FLAG, INTENT, whenLabel, providerOf, typeOf, WINDOWS, riskOf } from '../lib/format.js';
import { threads } from '../lib/metrics.js';

const FILTERS = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'needs', label: 'Needs you', test: t => needsYou(t.patient) },
  { value: 'moves', label: 'Moves', test: t => t.intents.has('reschedule') || t.intents.has('cancel') },
  { value: 'waitlist', label: 'Waitlist', test: t => t.intents.has('accept') || t.intents.has('decline') }
];

export default function Inbox() {
  const { id } = useParams();
  const { data, now, typing } = useDesk();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const all = useMemo(() => threads(data, now), [data, Math.floor(now / 2000)]);

  const list = useMemo(() => {
    const f = FILTERS.find(x => x.value === filter);
    const needle = q.trim().toLowerCase();
    return all
      .filter(f.test)
      .filter(t => !needle || [t.patient.name, t.patient.phone, phone(t.patient.phone)].some(v => v && String(v).toLowerCase().includes(needle)))
      .sort((a, b) => (needsYou(b.patient) - needsYou(a.patient)) || Date.parse(b.last) - Date.parse(a.last));
  }, [all, filter, q]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.value, all.filter(f.test).length])), [all]);
  const patient = id ? data.patients.find(p => p.id === id) : null;

  useEffect(() => {
    if (!id && list.length && window.matchMedia('(min-width: 1024px)').matches) navigate('/inbox/' + list[0].patientId, { replace: true });
  }, [id, list, navigate]);

  const preview = t => {
    if (typing(t.patientId)) return { text: 'AI is typing...', typing: true };
    const m = t.lastText;
    return { text: (m.dir === 'in' ? '' : m.author === 'staff' ? 'You: ' : 'AI: ') + m.body };
  };

  return (
    <div className={'inbox' + (patient ? ' has-thread' : '')}>
      <aside className="ib-list" aria-label="Conversations">
        <div className="ib-tools">
          <label className="search-field">
            <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or number" aria-label="Search conversations" />
          </label>
          <div className="ib-filters">
            <Segmented size="sm" label="Filter conversations" value={filter} onChange={setFilter} options={FILTERS.map(f => ({ value: f.value, label: f.label, count: f.value === 'needs' ? counts.needs || null : null }))} />
          </div>
          <span className="ib-count">{list.length} {list.length === 1 ? 'conversation' : 'conversations'}</span>
        </div>
        <ul className="ib-items">
          {list.map(t => {
            const p = preview(t);
            const hot = needsYou(t.patient);
            const last = [...t.intents].pop();
            return (
              <li key={t.patientId}>
                <Link to={'/inbox/' + t.patientId} className={'ib-item' + (patient && patient.id === t.patientId ? ' on' : '') + (hot ? ' is-hot' : '')}>
                  {patient && patient.id === t.patientId && <motion.span layoutId="ib-active" className="ib-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <Avatar patient={t.patient} size={40} />
                  <div className="ib-item-body">
                    <div className="ib-item-top">
                      <strong>{displayName(t.patient)}</strong>
                      <span>{ago(t.last, now)}</span>
                    </div>
                    <div className="ib-item-mid">
                      {hot ? (
                        <span className={'pill pill-sm pill-' + (t.patient.flag.kind === 'clinical' ? 'bad' : 'wait')}><i className="pill-dot" />{FLAG[t.patient.flag.kind].label}</span>
                      ) : last && INTENT[last] ? (
                        <span className={'pill pill-sm pill-intent t-' + INTENT[last].tone}><i className="pill-dot" />{INTENT[last].label}</span>
                      ) : null}
                      {t.patient.unread && <span className="ib-unread">New</span>}
                    </div>
                    <p className={'ib-preview' + (p.typing ? ' is-typing' : '')}>{p.text}</p>
                  </div>
                  {hot && <span className="ib-hot" aria-label="Needs you" />}
                </Link>
              </li>
            );
          })}
          {list.length === 0 && <li><Empty icon={MagnifyingGlass} title="No conversations match">Try another filter or search.</Empty></li>}
        </ul>
      </aside>
      {patient ? <Conversation patient={patient} key={patient.id} /> : (
        <div className="ib-empty">
          <Empty icon={ChatsCircle} title="Pick a conversation">Every reply to a reminder or a waitlist offer lands here.</Empty>
        </div>
      )}
    </div>
  );
}

const QUICK = ['We have you down, see you soon!', 'Could you give us a call when you get a moment?', 'No problem, we’ve moved it for you.', 'Thanks for letting us know.'];
const NOTE_ICON = { confirm: CalendarCheck, moved: ListNumbers, filled: ArrowsClockwise, refilled: ArrowsClockwise, offered: ArrowsClockwise, cancelled: CalendarX, flag: FirstAidKit, options: ListNumbers, late: Bell };
const NOTE_TONE = { confirm: 't-green', moved: 't-green', filled: 't-green', refilled: 't-green', offered: 't-blue', cancelled: 't-amber', flag: 't-red', options: 't-blue', late: 't-violet' };

function Conversation({ patient }) {
  const { data, now, visible, typing, act, busy, toast } = useDesk();
  const [draft, setDraft] = useState('');
  const [showSide, setShowSide] = useState(true);
  const scroller = useRef(null);
  const box = useRef(null);
  const msgs = visible(patient.id);
  const isTyping = typing(patient.id);
  const S = data.settings;

  useEffect(() => {
    if (patient.unread) act('read', { patient: patient.id }).catch(() => {});
  }, [patient.id]);

  const items = useMemo(() => {
    let day = null;
    const out = [];
    for (const m of msgs) {
      const d = new Date(m.at).toDateString();
      if (d !== day) {
        day = d;
        out.push({ kind: 'day', id: 'd' + d, at: m.at });
      }
      out.push({ kind: m.dir === 'note' ? 'note' : 'msg', id: m.id, at: m.at, m });
    }
    return out;
  }, [msgs]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [items.length, isTyping]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await act('send', { patient: patient.id, body }).catch(() => setDraft(body));
  };

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(patient.phone);
      toast('Number copied', 'good');
    } catch (e) {
      toast('Could not copy the number', 'bad');
    }
  };

  const dayLabel = at => {
    const d = new Date(at);
    const n = new Date(now);
    if (d.toDateString() === n.toDateString()) return 'Today';
    if (d.toDateString() === new Date(now - 86400000).toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const optedOut = patient.optedOut;
  const nextVisit = data.appts
    .filter(a => a.patientId === patient.id && (a.status === 'booked' || a.status === 'confirmed') && Date.parse(a.start) > now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  const wait = data.waitlist.find(w => w.patientId === patient.id && (w.status === 'waiting' || w.status === 'offered'));
  const flagged = needsYou(patient);

  return (
    <>
      <section className="ib-thread" aria-label={'Conversation with ' + displayName(patient)}>
        <header className="th-head">
          <Link to="/inbox" className="icon-btn th-back" aria-label="Back to all conversations"><CaretLeft size={18} weight="bold" /></Link>
          <Avatar patient={patient} size={40} />
          <div className="th-who">
            <strong>{displayName(patient)}</strong>
            <span className="th-sub">
              <span className={'ai-chip' + (patient.aiPaused ? ' is-owner' : '')}>
                {patient.aiPaused ? <><HandPalm size={11} weight="fill" /> Front desk is handling this</> : <><Sparkle size={11} weight="fill" /> AI is handling this</>}
              </span>
              <span className="th-sub-text">{phone(patient.phone)}</span>
            </span>
          </div>
          <div className="th-actions">
            <a className="btn btn-sm btn-soft" href={'tel:' + patient.phone}><PhoneIcon size={14} weight="fill" /> Call</a>
            {patient.aiPaused ? (
              <button type="button" className="btn btn-sm btn-violet" disabled={busy} onClick={() => act('pause', { patient: patient.id, paused: false }, 'The AI is replying again')}><Robot size={14} weight="fill" /> Hand back to AI</button>
            ) : (
              <button type="button" className="btn btn-sm btn-ghost" disabled={busy || optedOut} onClick={() => act('pause', { patient: patient.id, paused: true }, 'You have taken over this conversation')}><HandPalm size={14} weight="fill" /> Take over</button>
            )}
            <button type="button" className={'icon-btn th-side-toggle' + (showSide ? ' on' : '')} onClick={() => setShowSide(v => !v)} aria-label={showSide ? 'Hide details' : 'Show details'}><SidebarSimple size={18} /></button>
          </div>
        </header>

        <div className="th-body" ref={scroller}>
          {items.map(it => {
            if (it.kind === 'day') return <div key={it.id} className="th-day"><span>{dayLabel(it.at)}</span></div>;
            if (it.kind === 'note') {
              const m = it.m;
              const Icon = NOTE_ICON[m.kind] || Info;
              return (
                <div key={it.id} className={'th-event ' + (NOTE_TONE[m.kind] || 't-blue')}>
                  <Icon size={13} weight="fill" />
                  <span>{m.body}</span>
                  <time>{clock(m.at)}</time>
                </div>
              );
            }
            const m = it.m;
            const mine = m.dir === 'out';
            return (
              <motion.div key={it.id} className={'msg ' + (mine ? 'msg-out ' + (m.author === 'staff' ? 'owner' : 'ai') : 'msg-in')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {!mine && <Avatar patient={patient} size={28} />}
                <div className="msg-col">
                  <span className="msg-by">
                    {mine ? (m.author === 'staff' ? <><HandPalm size={11} weight="fill" /> Front desk</> : m.kind === 'reminder' ? <><Bell size={11} weight="fill" /> Reminder</> : m.kind === 'offer' ? <><ArrowsClockwise size={11} weight="bold" /> Waitlist offer</> : <><Sparkle size={11} weight="fill" /> AI assistant</>) : displayName(patient)}
                    <time>{clock(m.at)}</time>
                  </span>
                  <p>{m.body}</p>
                  {!mine && m.intent && INTENT[m.intent] && (
                    <span className={'msg-intent t-' + INTENT[m.intent].tone}><Brain size={11} weight="fill" /> Read as: {INTENT[m.intent].label}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
          <AnimatePresence>
            {isTyping && (
              <motion.div className="msg msg-out ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="msg-col">
                  <span className="msg-by"><Sparkle size={11} weight="fill" /> AI assistant</span>
                  <p className="typing" aria-label="AI is typing"><i /><i /><i /></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="th-compose">
          {!optedOut && (
            <div className="th-quick">
              {QUICK.map(t => <button key={t} type="button" onClick={() => { setDraft(t); box.current && box.current.focus(); }}>{t}</button>)}
            </div>
          )}
          <div className="th-input">
            <textarea
              ref={box}
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder={optedOut ? 'This patient opted out of texts' : 'Text ' + displayName(patient) + ' as the front desk'}
              aria-label="Your message"
              maxLength={480}
              disabled={optedOut}
            />
            <button type="button" className="btn btn-primary th-send" disabled={!draft.trim() || busy || optedOut} onClick={send} aria-label="Send"><PaperPlaneRight size={17} weight="fill" /></button>
          </div>
          <p className="th-hint">{optedOut ? 'They replied STOP, so no more texts can be sent.' : patient.aiPaused ? 'The AI stays quiet until you hand the conversation back.' : 'The AI keeps answering unless you take over. Enter to send, Shift and Enter for a new line.'}</p>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {showSide && (
          <motion.aside className="ib-side" aria-label="Patient details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}>
            <div className="side-contact">
              <Avatar patient={patient} size={56} />
              <strong>{displayName(patient)}</strong>
              <span>{phone(patient.phone)}</span>
              <div className="side-contact-actions">
                <a className="btn btn-sm btn-soft" href={'tel:' + patient.phone}><PhoneIcon size={13} weight="fill" /> Call</a>
                <button type="button" className="btn btn-sm btn-ghost" onClick={copy}><Copy size={13} weight="bold" /> Copy number</button>
              </div>
            </div>
            {flagged && (
              <div className={'side-alert' + (patient.flag.kind === 'clinical' ? ' urgent' : '')}>
                {patient.flag.kind === 'clinical' ? <FirstAidKit size={16} weight="fill" /> : <PhoneIcon size={16} weight="fill" />}
                <span>{patient.flag.kind === 'clinical' ? 'Health concern. A clinician should call them. The AI gave no advice.' : patient.flag.kind === 'callback' ? 'They asked for a call back.' : 'Waiting for a reply from the front desk.'}</span>
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => act('ack', { patient: patient.id }, 'Marked as handled')}><Check size={13} weight="bold" /> Handled</button>
              </div>
            )}
            {nextVisit ? (
              <div className="side-block">
                <span className="side-label">Next visit</span>
                <div className="side-visit">
                  <strong>{whenLabel(nextVisit.start, now)}</strong>
                  <span>{typeOf(S, nextVisit.type).name} with {providerOf(S, nextVisit.provider).short}</span>
                  <StatusPill appt={nextVisit} size="sm" />
                </div>
                <RiskMeter risk={riskOf(nextVisit, patient, now, S)} compact />
                <Link className="link-btn" to={'/schedule?appt=' + nextVisit.id}>Open in the schedule</Link>
              </div>
            ) : (
              <div className="side-block">
                <span className="side-label">Next visit</span>
                <p className="side-quote">Nothing booked.</p>
              </div>
            )}
            {wait && (
              <div className="side-block">
                <span className="side-label">On the waitlist</span>
                <p className="side-quote">{typeOf(S, wait.type).name}, {WINDOWS[wait.window].toLowerCase()}{wait.provider !== 'any' ? ', with ' + providerOf(S, wait.provider).short : ''}. Waiting {Math.max(1, Math.round((now - Date.parse(wait.addedAt)) / 86400000))} days.</p>
              </div>
            )}
            <div className="side-block">
              <span className="side-label">History</span>
              <ul className="side-times">
                <li><CalendarCheck size={13} weight="fill" /><span>Visits</span><em>{patient.visits}</em></li>
                <li><CalendarX size={13} weight="fill" /><span>No-shows</span><em>{patient.noShows}</em></li>
                <li><CalendarX size={13} weight="regular" /><span>Late cancellations</span><em>{patient.lateCancels}</em></li>
                <li><ChatsCircle size={13} weight="fill" /><span>Patient since</span><em>{new Date(patient.since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</em></li>
              </ul>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
