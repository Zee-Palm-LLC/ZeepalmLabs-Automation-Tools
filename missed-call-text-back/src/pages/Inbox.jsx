import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MagnifyingGlass, Phone as PhoneIcon, Robot, HandPalm, PaperPlaneTilt, CaretLeft, ChatsCircle, Check } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { StatusPill, Segmented } from '../components/bits.jsx';
import JobTicket from '../components/JobTicket.jsx';
import { phone, ago, stamp, displayName, needsYou, STATUS } from '../lib/format.js';

const FILTERS = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'needs', label: 'Needs you', test: needsYou },
  { value: 'open', label: 'Talking', test: l => ['texted', 'chatting', 'urgent'].includes(l.status) },
  { value: 'booked', label: 'Booked', test: l => l.status === 'booked' },
  { value: 'closed', label: 'Closed', test: l => ['no_reply', 'lost', 'opted_out'].includes(l.status) }
];

export default function Inbox() {
  const { id } = useParams();
  const { data, now, visible } = useDesk();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const list = useMemo(() => {
    const f = FILTERS.find(x => x.value === filter);
    const needle = q.trim().toLowerCase();
    return data.leads.filter(f.test).filter(l => !needle || [l.name, l.phone, phone(l.phone), l.issue, l.zip].some(v => v && String(v).toLowerCase().includes(needle)));
  }, [data.leads, filter, q]);

  const lead = id ? data.leads.find(l => l.id === id) : null;

  useEffect(() => {
    if (!id && list.length && window.matchMedia('(min-width: 960px)').matches) navigate('/inbox/' + list[0].id, { replace: true });
  }, [id, list, navigate]);

  const lastBody = l => {
    const m = visible(l.id).filter(x => x.dir !== 'note').slice(-1)[0];
    return m ? (m.dir === 'in' ? '' : m.author === 'owner' ? 'You: ' : 'AI: ') + m.body : '';
  };

  return (
    <div className={'inbox' + (lead ? ' has-thread' : '')}>
      <aside className="inbox-list" aria-label="Conversations">
        <div className="inbox-tools">
          <Segmented
            label="Filter conversations"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map(f => ({ value: f.value, label: f.label, count: f.value === 'needs' ? data.leads.filter(f.test).length || null : null }))}
          />
          <label className="search">
            <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, number, job or ZIP" aria-label="Search conversations" />
          </label>
        </div>
        <ul className="convos">
          {list.map(l => (
            <li key={l.id}>
              <Link to={'/inbox/' + l.id} className={'convo' + (lead && lead.id === l.id ? ' on' : '') + (needsYou(l) ? ' is-hot' : '')}>
                <div className="convo-top">
                  <strong>{displayName(l)}</strong>
                  <span>{ago(l.lastAt, now)}</span>
                </div>
                <div className="convo-mid">
                  <StatusPill status={l.status} urgent={l.urgent} />
                  {l.issue && <span className="convo-issue">{l.issue}</span>}
                </div>
                <p className="convo-last">{lastBody(l)}</p>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="empty small"><p>No conversations match.</p></li>}
        </ul>
      </aside>
      {lead ? <Conversation lead={lead} key={lead.id} /> : (
        <div className="inbox-empty empty">
          <ChatsCircle size={30} weight="duotone" />
          <p>Pick a conversation to read it.</p>
        </div>
      )}
    </div>
  );
}

function Conversation({ lead }) {
  const { data, now, visible, typing, act, busy } = useDesk();
  const [draft, setDraft] = useState('');
  const scroller = useRef(null);
  const msgs = visible(lead.id);
  const isTyping = typing(lead.id);
  const s = data.settings;
  const calls = data.calls.filter(c => c.leadId === lead.id);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, isTyping]);

  const send = async e => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await act('send', { lead: lead.id, body }).catch(() => setDraft(body));
  };

  return (
    <>
      <section className="convo-thread" aria-label={'Conversation with ' + displayName(lead)}>
        <header className="ct-head">
          <Link to="/inbox" className="ct-back" aria-label="Back to all conversations"><CaretLeft size={18} weight="bold" /></Link>
          <div className="ct-who">
            <strong>{displayName(lead)}</strong>
            <span>{phone(lead.phone)}{calls.length > 0 && ', called ' + calls.length + (calls.length === 1 ? ' time' : ' times')}</span>
          </div>
          <div className="ct-actions">
            <a className="btn btn-small" href={'tel:' + lead.phone}><PhoneIcon size={14} weight="fill" /> Call</a>
            {lead.aiPaused ? (
              <button type="button" className="btn btn-small btn-ai" disabled={busy} onClick={() => act('pause', { lead: lead.id, paused: false }, 'The AI is replying again')}><Robot size={14} weight="fill" /> Hand back to AI</button>
            ) : (
              <button type="button" className="btn btn-small btn-ghost" disabled={busy} onClick={() => act('pause', { lead: lead.id, paused: true }, 'You have taken over this conversation')}><HandPalm size={14} weight="fill" /> Take over</button>
            )}
          </div>
        </header>
        <div className="ct-body" ref={scroller}>
          {calls.slice().reverse().map(c => (
            <p key={c.id} className="ct-note ct-call">{c.outcome === 'after_hours' ? 'Missed call after hours' : c.outcome === 'answered' ? 'Answered call' : 'Missed call'}, {stamp(c.at, now)}{c.note ? '. ' + c.note : ''}</p>
          ))}
          {msgs.map(m => m.dir === 'note' ? (
            <p key={m.id} className="ct-note">{m.body}<span>{stamp(m.at, now)}</span></p>
          ) : (
            <div key={m.id} className={'ct-msg ' + (m.dir === 'in' ? 'from-them' : 'from-us ' + m.author)}>
              <span className="ct-by">{m.dir === 'in' ? displayName(lead) : m.author === 'owner' ? s.ownerName : 'AI'}</span>
              <p>{m.body}</p>
              <time dateTime={m.at}>{stamp(m.at, now)}</time>
            </div>
          ))}
          {isTyping && <div className="ct-msg from-us ai ct-typing" aria-label="AI is typing"><p><i /><i /><i /></p></div>}
        </div>
        <form className="ct-compose" onSubmit={send}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={'Text ' + displayName(lead) + ' as ' + s.ownerName} aria-label="Your message" maxLength={480} disabled={lead.status === 'opted_out'} />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim() || busy}><PaperPlaneTilt size={16} weight="fill" /> Send</button>
        </form>
        <p className="ct-hint">{lead.status === 'opted_out' ? 'This person opted out, so no more texts can be sent.' : lead.aiPaused ? 'You have this conversation. The AI stays quiet until you hand it back.' : 'Sending a message takes over from the AI for this conversation.'}</p>
      </section>
      <aside className="convo-side" aria-label="Job details">
        <JobTicket lead={lead} compact />
        {needsYou(lead) && (
          <button type="button" className="btn btn-primary wide" disabled={busy} onClick={() => act('ack', { lead: lead.id }, 'Marked as handled')}><Check size={16} weight="bold" /> Mark as handled</button>
        )}
        <label className="field">
          <span>Status</span>
          <select value={lead.status} onChange={e => act('status', { lead: lead.id, status: e.target.value }, 'Status updated')} disabled={busy}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        {lead.summary && (
          <div className="side-note">
            <span>First message</span>
            <p>{lead.summary}</p>
          </div>
        )}
      </aside>
    </>
  );
}
