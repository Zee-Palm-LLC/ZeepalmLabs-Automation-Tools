import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneIncoming, PhoneX, MoonStars } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { StatusPill, Segmented } from '../components/bits.jsx';
import { phone, stamp, duration, displayName, timeLabel } from '../lib/format.js';

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export default function Calls() {
  const { data, now } = useDesk();
  const [filter, setFilter] = useState('missed');
  const [limit, setLimit] = useState(40);
  const st = data.stats;
  const leads = Object.fromEntries(data.leads.map(l => [l.id, l]));
  const since = now - 30 * 86400000;
  const calls = data.calls.filter(c => Date.parse(c.at) >= since && (filter === 'all' || (filter === 'missed' ? c.outcome !== 'answered' : c.outcome === 'answered')));
  const heat = st.heat;
  const peak = Math.max(1, ...heat.flat());

  let best = null;
  for (let h = 6; h <= 19; h++) {
    const sum = [1, 2, 3, 4, 5].reduce((a, d) => a + heat[d][h] + heat[d][h + 1] + heat[d][h + 2], 0);
    if (!best || sum > best.sum) best = { h, sum };
  }
  const total = st.missed || 1;
  const hourLabel = h => timeLabel(new Date(2000, 0, 1, h).getTime());

  return (
    <div className="calls">
      <section className="stat-strip">
        <div className="stat"><PhoneIncoming size={20} weight="bold" /><span>Calls</span><strong>{st.calls}</strong></div>
        <div className="stat"><PhoneIncoming size={20} weight="bold" className="ok" /><span>Answered</span><strong>{st.answered}</strong></div>
        <div className="stat"><PhoneX size={20} weight="bold" className="bad" /><span>Missed</span><strong>{st.missed}</strong></div>
        <div className="stat"><MoonStars size={20} weight="bold" /><span>After hours</span><strong>{st.afterHours}</strong></div>
      </section>

      <section className="panel" aria-labelledby="heat-title">
        <div className="panel-head">
          <div>
            <h2 id="heat-title" className="section-title">When calls get missed</h2>
            {best && best.sum > 0 && (
              <p className="muted">{Math.round((best.sum / total) * 100)}% of missed calls land on weekdays between {hourLabel(best.h)} and {hourLabel(best.h + 3)}, when the team is out on jobs.</p>
            )}
          </div>
        </div>
        <div className="heat" role="table" aria-label="Missed calls by day and hour">
          <div className="heat-row heat-hours" role="row">
            <span role="columnheader" />
            {HOURS.map(h => <span key={h} role="columnheader">{h % 3 === 0 ? hourLabel(h) : ''}</span>)}
          </div>
          {DAYS.map(d => (
            <div key={d} className="heat-row" role="row">
              <span role="rowheader">{NAMES[d]}</span>
              {HOURS.map(h => {
                const v = heat[d][h];
                return <span key={h} role="cell" className="heat-cell" style={{ '--a': v ? 0.18 + (v / peak) * 0.82 : 0 }} title={NAMES[d] + ' ' + hourLabel(h) + ': ' + v + ' missed'} aria-label={v + ' missed'} />;
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="log-title">
        <div className="panel-head">
          <h2 id="log-title" className="section-title">Call log</h2>
          <Segmented label="Filter calls" value={filter} onChange={v => { setFilter(v); setLimit(40); }} options={[{ value: 'missed', label: 'Missed' }, { value: 'answered', label: 'Answered' }, { value: 'all', label: 'All' }]} />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>When</th><th>Caller</th><th>Call</th><th>Text back</th><th>What happened</th></tr>
            </thead>
            <tbody>
              {calls.slice(0, limit).map(c => {
                const l = c.leadId ? leads[c.leadId] : null;
                return (
                  <tr key={c.id}>
                    <td className="nowrap">{stamp(c.at, now)}</td>
                    <td>{l ? <Link to={'/inbox/' + l.id}>{displayName(l)}</Link> : phone(c.phone)}</td>
                    <td>{c.outcome === 'answered' ? <span className="call-tag ok">Answered, {duration(c.duration)}</span> : <span className="call-tag bad">{c.outcome === 'after_hours' ? 'Missed after hours' : 'Missed'}</span>}</td>
                    <td>{c.textBackSeconds != null ? <strong className="tb">{c.textBackSeconds}s</strong> : c.note ? <span className="muted">{c.note}</span> : <span className="muted">Not needed</span>}</td>
                    <td>{l ? <span className="what"><StatusPill status={l.status} urgent={l.urgent} />{l.issue && <span>{l.issue}</span>}</span> : <span className="muted">Talked on the phone</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {calls.length > limit && <button type="button" className="btn btn-ghost more" onClick={() => setLimit(x => x + 60)}>Show more calls</button>}
      </section>
    </div>
  );
}
