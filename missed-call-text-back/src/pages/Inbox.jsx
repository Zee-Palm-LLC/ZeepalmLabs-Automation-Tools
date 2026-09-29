import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  MagnifyingGlass, Phone as PhoneIcon, Robot, HandPalm, PaperPlaneRight, CaretLeft, ChatsCircle, Check, PhoneX, Siren, CalendarCheck,
  Sparkle, Copy, SidebarSimple, Info, Clock
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { StatusPill, Segmented, Avatar, Empty } from '../components/ui.jsx';
import JobTicket from '../components/JobTicket.jsx';
import { phone, ago, stamp, clock, displayName, needsYou, STATUS } from '../lib/format.js';

const FILTERS = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'needs', label: 'Needs you', test: needsYou },
  { value: 'open', label: 'Talking', test: l => ['texted', 'chatting', 'urgent'].includes(l.status) },
  { value: 'booked', label: 'Booked', test: l => l.status === 'booked' },
  { value: 'closed', label: 'Closed', test: l => ['no_reply', 'lost', 'opted_out'].includes(l.status) }
];

export default function Inbox() {
  const { id } = useParams();
  const { data, now, visible, typing } = useDesk();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const list = useMemo(() => {
    const f = FILTERS.find(x => x.value === filter);
    const needle = q.trim().toLowerCase();
    return data.leads.filter(f.test).filter(l => !needle || [l.name, l.phone, phone(l.phone), l.issue, l.zip].some(v => v && String(v).toLowerCase().includes(needle)));
  }, [data.leads, filter, q]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.value, data.leads.filter(f.test).length])), [data.leads]);
  const lead = id ? data.leads.find(l => l.id === id) : null;

  useEffect(() => {
    if (!id && list.length && window.matchMedia('(min-width: 1024px)').matches) navigate('/inbox/' + list[0].id, { replace: true });
  }, [id, list, navigate]);

  const preview = l => {
    if (typing(l.id)) return { text: 'AI is typing...', typing: true };
    const m = visible(l.id).filter(x => x.dir !== 'note').slice(-1)[0];
    if (!m) return { text: 'No messages yet' };
    return { text: (m.dir === 'in' ? '' : m.author === 'owner' ? 'You: ' : 'AI: ') + m.body };
  };

  return (
    <div className={'inbox' + (lead ? ' has-thread' : '')}>
      <aside className="ib-list" aria-label="Conversations">
        <div className="ib-tools">
          <label className="search-field">
            <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, number, job or ZIP" aria-label="Search conversations" />
          </label>
          <div className="ib-filters">
            <Segmented size="sm" label="Filter conversations" value={filter} onChange={setFilter} options={FILTERS.map(f => ({ value: f.value, label: f.label, count: f.value === 'needs' ? counts.needs || null : null }))} />
          </div>
          <span className="ib-count">{list.length} {list.length === 1 ? 'conversation' : 'conversations'}</span>
        </div>
        <ul className="ib-items">
          {list.map(l => {
            const p = preview(l);
            const hot = needsYou(l);
            return (
              <li key={l.id}>
                <Link to={'/inbox/' + l.id} className={'ib-item' + (lead && lead.id === l.id ? ' on' : '') + (hot ? ' is-hot' : '')}>
                  {lead && lead.id === l.id && <motion.span layoutId="ib-active" className="ib-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <Avatar lead={l} size={40} />
                  <div className="ib-item-body">
                    <div className="ib-item-top">
                      <strong>{displayName(l)}</strong>
                      <span>{ago(l.lastAt, now)}</span>
                    </div>
                    <div className="ib-item-mid">
                      <StatusPill status={l.status} urgent={l.urgent} size="sm" />
                      {l.issue && <span className="ib-issue">{l.issue}</span>}
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
      {lead ? <Conversation lead={lead} key={lead.id} /> : (
        <div className="ib-empty">
          <Empty icon={ChatsCircle} title="Pick a conversation">Every missed call starts a thread here.</Empty>
        </div>
      )}
    </div>
  );
}

const QUICK = ['On my way now', 'Can you send a photo of the problem?', "We're running about 15 minutes late", 'Thanks, see you then'];

function Conversation({ lead }) {
  const { data, now, visible, typing, act, busy, toast } = useDesk();
  const [draft, setDraft] = useState('');
  const [showSide, setShowSide] = useState(true);
  const scroller = useRef(null);
  const box = useRef(null);
  const msgs = visible(lead.id);
  const isTyping = typing(lead.id);
  const s = data.settings;
  const calls = data.calls.filter(c => c.leadId === lead.id);

  const items = useMemo(() => {
    const ev = [
      ...calls.map(c => ({ kind: 'call', id: c.id, at: c.at, call: c })),
      ...msgs.map(m => ({ kind: m.dir === 'note' ? 'note' : 'msg', id: m.id, at: m.at, m }))
    ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    let day = null;
    const out = [];
    for (const e of ev) {
      const d = new Date(e.at).toDateString();
      if (d !== day) {
        day = d;
        out.push({ kind: 'day', id: 'd' + d, at: e.at });
      }
      out.push(e);
    }
    return out;
  }, [calls, msgs]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [items.length, isTyping]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await act('send', { lead: lead.id, body }).catch(() => setDraft(body));
  };

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lead.phone);
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

  const optedOut = lead.status === 'opted_out';

  return (
    <>
      <section className="ib-thread" aria-label={'Conversation with ' + displayName(lead)}>
        <header className="th-head">
          <Link to="/inbox" className="icon-btn th-back" aria-label="Back to all conversations"><CaretLeft size={18} weight="bold" /></Link>
          <Avatar lead={lead} size={40} />
          <div className="th-who">
            <strong>{displayName(lead)}</strong>
            <span className="th-sub">
              <span className={'ai-chip' + (lead.aiPaused ? ' is-owner' : '')}>
                {lead.aiPaused ? <><HandPalm size={11} weight="fill" /> You're handling this</> : <><Sparkle size={11} weight="fill" /> AI is handling this</>}
              </span>
              <span className="th-sub-text">{lead.name ? phone(lead.phone) : lead.issue || 'New caller'}{lead.zip ? ', ' + lead.zip : ''}</span>
            </span>
          </div>
          <div className="th-actions">
            <a className="btn btn-sm btn-soft" href={'tel:' + lead.phone}><PhoneIcon size={14} weight="fill" /> Call</a>
            {lead.aiPaused ? (
              <button type="button" className="btn btn-sm btn-violet" disabled={busy} onClick={() => act('pause', { lead: lead.id, paused: false }, 'The AI is replying again')}><Robot size={14} weight="fill" /> Hand back to AI</button>
            ) : (
              <button type="button" className="btn btn-sm btn-ghost" disabled={busy || optedOut} onClick={() => act('pause', { lead: lead.id, paused: true }, 'You have taken over this conversation')}><HandPalm size={14} weight="fill" /> Take over</button>
            )}
            <button type="button" className={'icon-btn th-side-toggle' + (showSide ? ' on' : '')} onClick={() => setShowSide(v => !v)} aria-label={showSide ? 'Hide details' : 'Show details'}><SidebarSimple size={18} /></button>
          </div>
        </header>

        <div className="th-body" ref={scroller}>
          {items.map(it => {
            if (it.kind === 'day') return <div key={it.id} className="th-day"><span>{dayLabel(it.at)}</span></div>;
            if (it.kind === 'call') {
              const c = it.call;
              return (
                <div key={it.id} className="th-event t-red">
                  <PhoneX size={13} weight="fill" />
                  <span>{c.outcome === 'after_hours' ? 'Missed call after hours' : c.outcome === 'answered' ? 'Answered call' : 'Missed call'}{c.textBackSeconds != null ? ', texted back in ' + c.textBackSeconds + 's' : c.note ? ', ' + c.note.toLowerCase() : ''}</span>
                  <time>{clock(c.at)}</time>
                </div>
              );
            }
            if (it.kind === 'note') {
              const m = it.m;
              const tone = /alerted/.test(m.body) ? 't-amber' : /Booked|booked|Emergency visit/.test(m.body) ? 't-green' : 't-blue';
              const Icon = tone === 't-amber' ? Siren : tone === 't-green' ? CalendarCheck : Info;
              return (
                <div key={it.id} className={'th-event ' + tone}>
                  <Icon size={13} weight="fill" />
                  <span>{m.body}</span>
                  <time>{clock(m.at)}</time>
                </div>
              );
            }
            const m = it.m;
            const mine = m.dir === 'out';
            return (
              <motion.div key={it.id} className={'msg ' + (mine ? 'msg-out ' + m.author : 'msg-in')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {!mine && <Avatar lead={lead} size={28} />}
                <div className="msg-col">
                  <span className="msg-by">
                    {mine ? (m.author === 'owner' ? <><HandPalm size={11} weight="fill" /> {s.ownerName}</> : <><Sparkle size={11} weight="fill" /> AI assistant</>) : displayName(lead)}
                    <time>{clock(m.at)}</time>
                  </span>
                  <p>{m.body}</p>
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
              placeholder={optedOut ? 'This person opted out of texts' : 'Text ' + displayName(lead) + ' as ' + s.ownerName}
              aria-label="Your message"
              maxLength={480}
              disabled={optedOut}
            />
            <button type="button" className="btn btn-primary th-send" disabled={!draft.trim() || busy || optedOut} onClick={send} aria-label="Send"><PaperPlaneRight size={17} weight="fill" /></button>
          </div>
          <p className="th-hint">{optedOut ? 'They replied STOP, so no more texts can be sent.' : lead.aiPaused ? 'The AI stays quiet until you hand the conversation back.' : 'Sending a message takes over from the AI. Enter to send, Shift and Enter for a new line.'}</p>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {showSide && (
          <motion.aside className="ib-side" aria-label="Job details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}>
            <div className="side-contact">
              <Avatar lead={lead} size={56} />
              <strong>{displayName(lead)}</strong>
              <span>{lead.name ? phone(lead.phone) : lead.issue || 'Caller not named yet'}</span>
              <div className="side-contact-actions">
                <a className="btn btn-sm btn-soft" href={'tel:' + lead.phone}><PhoneIcon size={13} weight="fill" /> Call</a>
                <button type="button" className="btn btn-sm btn-ghost" onClick={copy}><Copy size={13} weight="bold" /> Copy number</button>
              </div>
            </div>
            {needsYou(lead) && (
              <div className={'side-alert' + (lead.urgent ? ' urgent' : '')}>
                {lead.urgent ? <Siren size={16} weight="fill" /> : <PhoneIcon size={16} weight="fill" />}
                <span>{lead.urgent ? 'Emergency. Call them back if you have not already.' : 'They asked for a call back.'}</span>
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => act('ack', { lead: lead.id }, 'Marked as handled')}><Check size={13} weight="bold" /> Handled</button>
              </div>
            )}
            <JobTicket lead={lead} compact />
            <div className="side-block">
              <span className="side-label">Status</span>
              <select className="select" value={lead.status} onChange={e => act('status', { lead: lead.id, status: e.target.value }, 'Status changed to ' + STATUS[e.target.value].label.toLowerCase())} disabled={busy}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="side-block">
              <span className="side-label">Timeline</span>
              <ul className="side-times">
                <li><PhoneX size={13} weight="fill" /><span>First missed call</span><em>{stamp(lead.createdAt, now)}</em></li>
                {lead.textBackSeconds != null && <li><Clock size={13} weight="fill" /><span>Texted back after</span><em>{lead.textBackSeconds}s</em></li>}
                {lead.firstReplyAt && <li><ChatsCircle size={13} weight="fill" /><span>First reply</span><em>{stamp(lead.firstReplyAt, now)}</em></li>}
                {lead.bookedAt && <li><CalendarCheck size={13} weight="fill" /><span>Booked {lead.bookedBy === 'ai' ? 'by AI' : 'by ' + s.ownerName}</span><em>{stamp(lead.bookedAt, now)}</em></li>}
                <li><PhoneIcon size={13} weight="fill" /><span>Calls from this number</span><em>{Math.max(lead.callCount || 0, calls.length)}</em></li>
              </ul>
            </div>
            {lead.summary && (
              <div className="side-block">
                <span className="side-label">In their words</span>
                <p className="side-quote">{lead.summary}</p>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
