import { Link, useNavigate } from 'react-router-dom';
import { Phone as PhoneIcon, Check, Siren, PhoneCall, CaretRight } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import Phone from '../components/Phone.jsx';
import Timeline from '../components/Timeline.jsx';
import JobTicket from '../components/JobTicket.jsx';
import { CountUp } from '../components/bits.jsx';
import { money, pct, phone, ago, needsYou, displayName, STATUS } from '../lib/format.js';

export default function Live() {
  const { data, sim, typing, demo } = useDesk();
  const lead = sim.leadId ? data.leads.find(l => l.id === sim.leadId) : null;
  return (
    <>
      <section className="line" aria-labelledby="line-title">
        <div className="line-grid">
          <div className="line-head">
            <h1 id="line-title">Every missed call gets a text back in seconds.</h1>
            <p>Call {data.settings.shortName}'s demo line and let it ring out. The AI texts you back, works out the job and books it, the same way it would for a real customer.</p>
          </div>
          <div className="line-col line-steps">
            <h2 className="line-label">{sim.phase === 'dial' ? 'What happens when you call' : 'What just happened'}</h2>
            <Timeline />
          </div>
          <div className="line-phone"><Phone /></div>
          <div className="line-col line-ticket">
            <h2 className="line-label">What the AI understood</h2>
            <JobTicket lead={lead} hold={lead ? typing(lead.id) : false} empty="Filled in live from the customer's texts." />
            <p className="line-foot">
              {!data.settings.aiEnabled ? 'AI replies are switched off in Settings.' : demo ? 'Replies here come from a scripted stand-in so the demo costs nothing to run. In the live version Claude writes them.' : 'Replies come from Claude through your n8n workspace.'}
            </p>
          </div>
        </div>
      </section>
      <Scoreboard />
      <div className="live-lower">
        <CallBoard />
        <NeedsYou />
      </div>
    </>
  );
}

function Scoreboard() {
  const { data } = useDesk();
  const st = data.stats;
  const cur = data.settings.currency;
  const cells = [
    { k: 'Missed calls', v: st.missed, sub: st.afterHours + ' after hours' },
    { k: 'Texted back', v: st.texted, sub: 'in ' + st.avgTextBack + 's on average' },
    { k: 'Replied', v: st.replied, sub: pct(st.replyRate) + ' of texts' },
    { k: 'Booked', v: st.booked, sub: st.bookedByAi + ' by the AI on its own' },
    { k: 'Won back', v: st.recovered, money: true, sub: 'in jobs from unanswered calls' }
  ];
  return (
    <section className="score" aria-labelledby="score-title">
      <h2 id="score-title" className="section-title">Last 30 days</h2>
      <ol className="score-row">
        {cells.map((c, i) => (
          <li key={c.k} className={'score-cell' + (c.money ? ' is-money' : '')}>
            <span className="score-k">{c.k}</span>
            <strong className="score-v"><CountUp value={c.v} format={v => (c.money ? money(v, cur) : Math.round(v).toLocaleString('en-US'))} /></strong>
            <span className="score-sub">{c.sub}</span>
            {i < cells.length - 1 && <CaretRight className="score-arrow" size={18} weight="bold" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

const TILE = { booked: 'booked', chatting: 'live', texted: 'live', urgent: 'urgent', no_reply: 'quiet', lost: 'lost', opted_out: 'quiet' };

function CallBoard() {
  const { data, now } = useDesk();
  const navigate = useNavigate();
  const today = new Date(now);
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
  const byDay = days.map(d => {
    const key = d.toDateString();
    return data.leads
      .filter(l => l.source === 'call' && new Date(l.createdAt).toDateString() === key)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });
  const max = Math.max(6, ...byDay.map(x => x.length));
  const legend = [
    ['booked', 'Booked'],
    ['urgent', 'Emergency booked'],
    ['live', 'Still talking'],
    ['quiet', 'No reply'],
    ['lost', 'Lost']
  ];
  return (
    <section className="panel board" aria-labelledby="board-title">
      <div className="panel-head">
        <div>
          <h2 id="board-title" className="section-title">Every missed call, last 30 days</h2>
          <p className="muted">One square per call nobody answered. Green ones turned into jobs.</p>
        </div>
      </div>
      <div className="board-grid" style={{ '--rows': max }}>
        {byDay.map((list, i) => {
          const d = days[i];
          const mark = i === 29 ? 'Today' : d.getDay() === 1 && i < 26 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          return (
            <div key={i} className={'board-col' + (d.getDay() === 0 ? ' is-sun' : '')}>
              <div className="board-stack">
                {list.map(l => {
                  const tone = l.urgent && l.status === 'booked' ? 'urgent' : TILE[l.status] || 'quiet';
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={'tile tile-' + tone}
                      title={displayName(l) + ': ' + (l.issue || 'no details yet') + ', ' + (STATUS[l.status] ? STATUS[l.status].label.toLowerCase() : l.status)}
                      aria-label={displayName(l) + ', ' + (STATUS[l.status] ? STATUS[l.status].label : l.status)}
                      onClick={() => navigate('/inbox/' + l.id)}
                    />
                  );
                })}
              </div>
              <span className="board-day">{mark}</span>
            </div>
          );
        })}
      </div>
      <ul className="legend">
        {legend.map(([k, label]) => <li key={k}><span className={'tile tile-' + k} aria-hidden="true" />{label}</li>)}
      </ul>
    </section>
  );
}

function NeedsYou() {
  const { data, act, busy, now } = useDesk();
  const list = data.leads.filter(needsYou);
  return (
    <section className="panel needs" aria-labelledby="needs-title">
      <div className="panel-head">
        <div>
          <h2 id="needs-title" className="section-title">Needs you</h2>
          <p className="muted">Emergencies and people who asked for a call.</p>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <Check size={22} weight="bold" />
          <p>Nothing needs you right now. The AI is handling every conversation.</p>
        </div>
      ) : (
        <ul className="needs-list">
          {list.map(l => (
            <li key={l.id} className={'need' + (l.urgent ? ' is-urgent' : '')}>
              <span className="need-icon">{l.urgent ? <Siren size={18} weight="fill" /> : <PhoneCall size={18} weight="fill" />}</span>
              <div className="need-text">
                <Link to={'/inbox/' + l.id}><strong>{displayName(l)}</strong></Link>
                <span>{l.urgent ? (l.issue || 'Emergency') + (l.status === 'booked' ? ', visit booked' : '') : 'Asked for a call back' + (l.issue ? ' about ' + l.issue.toLowerCase() : '')}</span>
                <em>{ago(l.alertedAt || l.lastAt, now)}</em>
              </div>
              <div className="need-actions">
                <a className="btn btn-small" href={'tel:' + l.phone} aria-label={'Call ' + phone(l.phone)}><PhoneIcon size={14} weight="fill" /> Call</a>
                <button type="button" className="btn btn-small btn-ghost" disabled={busy} onClick={() => act('ack', { lead: l.id }, 'Marked as handled')}>Handled</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
