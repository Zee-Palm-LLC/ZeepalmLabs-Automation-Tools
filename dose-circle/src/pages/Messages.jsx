import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaretLeft, PaperPlaneTilt, Robot, PauseCircle, PlayCircle } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { Avatar, Tag, Empty } from '../components/ui.jsx';
import { personOf, memberOf, threadOwner } from '../lib/metrics.js';
import { dayName, time, first, phone } from '../lib/format.js';
import { dayStart } from '../demo/engine.js';

const INTENT = { taken: ['Taken', 'good'], partial: ['Skipped one', 'warn'], skipped: ['Skipped', 'quiet'], later: ['Later', 'blue'], symptom: ['Not well', 'warn'], emergency: ['Urgent', 'bad'], double: ['Extra dose', 'bad'], low: ['Running low', 'blue'], reading: ['Reading', 'violet'], question: ['Question', 'violet'], callback: ['Wants a call', 'violet'], ack: ['On it', 'good'], done: ['Done', 'good'], ordered: ['Ordered', 'blue'], picked: ['Picked up', 'good'], status: ['Status', 'quiet'], other: ['Unclear', 'quiet'] };

export default function Messages() {
  const { data, now, act, busy } = useCare();
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const body = useRef(null);
  const threads = [...data.people, ...data.circle].map(w => {
    const msgs = data.messages.filter(m => m.thread === w.id && m.dir !== 'note' && Date.parse(m.at) <= now);
    return { who: w, last: msgs[msgs.length - 1], count: msgs.length };
  }).sort((a, b) => (b.last ? Date.parse(b.last.at) : 0) - (a.last ? Date.parse(a.last.at) : 0));
  const active = id ? threadOwner(data, id) : null;
  const msgs = active ? data.messages.filter(m => m.thread === active.id && Date.parse(m.at) <= now) : [];
  const isPerson = active && !!personOf(data, active.id);
  const me = memberOf(data, data.settings.viewer);

  useEffect(() => {
    if (active && active.unread) act('read', { thread: active.id }).catch(() => {});
  }, [active ? active.id : null]);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active ? active.id : null, msgs.length]);

  const send = async e => {
    e.preventDefault();
    const b = draft.trim();
    if (!b) return;
    setDraft('');
    await act('send', { thread: active.id, body: b }, 'Sent to ' + first(active.name));
  };

  let lastDay = null;
  return (
    <div className={'msgs' + (active ? ' has-thread' : '')}>
      <aside className="msg-list" aria-label="Conversations">
        {threads.map(t => (
          <button key={t.who.id} type="button" className={'msg-row' + (active && active.id === t.who.id ? ' is-on' : '') + (t.who.unread ? ' is-unread' : '')} onClick={() => navigate('/messages/' + t.who.id)}>
            <Avatar who={t.who} size={40} />
            <span className="msg-row-main">
              <span className="msg-row-top"><b>{t.who.name}</b><time>{t.last ? (dayStart(Date.parse(t.last.at)) === dayStart(now) ? time(t.last.at) : dayName(t.last.at, now).replace(/,.*/, '')) : ''}</time></span>
              <span className="msg-row-sub">{personOf(data, t.who.id) ? 'Gets reminders' : t.who.relation}</span>
              <span className="msg-row-last">{t.last ? (t.last.dir === 'in' ? '' : 'Dose Circle: ') + t.last.body : 'No messages yet'}</span>
            </span>
          </button>
        ))}
      </aside>
      <section className="msg-thread">
        {!active && <Empty icon={Robot} title="Pick a conversation">Every text Dose Circle sends and receives, for Mom, Dad and the family.</Empty>}
        {active && (
          <>
            <header className="msg-head">
              <button type="button" className="icon-btn msg-back" onClick={() => navigate('/messages')} aria-label="Back to conversations"><CaretLeft size={18} weight="bold" /></button>
              <Avatar who={active} size={38} />
              <div>
                <strong>{active.name}</strong>
                <span>{phone(active.phone)}{isPerson ? ', gets medicine reminders' : ', ' + active.relation.toLowerCase()}</span>
              </div>
              {isPerson && (
                <button type="button" className="btn btn-sm btn-ghost push" disabled={busy} onClick={() => act('pause', { person: active.id, paused: !active.aiPaused }, active.aiPaused ? 'Automatic replies back on' : 'Automatic replies paused')}>
                  {active.aiPaused ? <PlayCircle size={15} weight="fill" /> : <PauseCircle size={15} weight="fill" />} {active.aiPaused ? 'Turn replies back on' : 'Pause automatic replies'}
                </button>
              )}
            </header>
            <div className="msg-body" ref={body}>
              {msgs.map(m => {
                const day = dayStart(Date.parse(m.at));
                const head = day !== lastDay ? <p className="msg-day" key={'d' + m.id}>{dayName(m.at, now)}</p> : null;
                lastDay = day;
                const tag = m.dir === 'in' && INTENT[m.intent];
                if (m.dir === 'note') return [head, <p key={m.id} className="msg-note">{m.body}<time>{time(m.at)}</time></p>];
                return [
                  head,
                  <div key={m.id} className={'msg msg-' + m.dir + (m.author === 'family' ? ' is-family' : '')}>
                    <div className="msg-bubble">{m.body}</div>
                    <span className="msg-meta">
                      {m.dir === 'in' ? first(active.name) : m.author === 'family' ? 'Sent by ' + first((memberOf(data, m.by) || {}).name || 'family') : 'Dose Circle'}, {time(m.at)}
                      {tag && <Tag tone={tag[1]} size="sm">{tag[0]}</Tag>}
                    </span>
                  </div>
                ];
              })}
            </div>
            <form className="msg-compose" onSubmit={send}>
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={'Text ' + first(active.name) + ' from the Dose Circle number' + (isPerson && me ? ', signed ' + first(me.name) : '')} aria-label="Message" maxLength={480} />
              <button type="submit" className="btn btn-primary" disabled={!draft.trim() || busy}><PaperPlaneTilt size={16} weight="fill" /> Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
