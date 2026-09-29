import { Link } from 'react-router-dom';
import { Robot, User, Siren } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { money, timeLabel, displayName, stamp } from '../lib/format.js';

const DAY = 86400000;

export default function Jobs() {
  const { data, now } = useDesk();
  const s = data.settings;
  const cur = s.currency;
  const booked = data.leads.filter(l => l.status === 'booked' && l.slot);
  const today = new Date(now);
  const upcoming = booked.filter(l => Date.parse(l.slot) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime());
  const recent = booked.filter(l => Date.parse(l.createdAt) >= now - 30 * DAY).sort((a, b) => Date.parse(b.bookedAt || b.slot) - Date.parse(a.bookedAt || a.slot));
  const speeds = recent.filter(l => l.bookedBy === 'ai' && l.bookedAt).map(l => (Date.parse(l.bookedAt) - Date.parse(l.createdAt)) / 60000).sort((a, b) => a - b);
  const median = speeds.length ? Math.round(speeds[Math.floor(speeds.length / 2)]) : 0;
  const value = recent.reduce((a, l) => a + (Number(l.value) || 0), 0);

  return (
    <div className="jobs">
      <section className="stat-strip">
        <div className="stat"><span>Jobs booked from missed calls</span><strong>{recent.length}</strong><em>last 30 days</em></div>
        <div className="stat"><span>Booked by the AI</span><strong>{recent.filter(l => l.bookedBy === 'ai').length}</strong><em>no call back needed</em></div>
        <div className="stat"><span>From missed call to booked</span><strong>{median} min</strong><em>median, when the AI books</em></div>
        <div className="stat is-money"><span>Value of those jobs</span><strong>{money(value, cur)}</strong><em>at typical job prices</em></div>
      </section>

      <section className="panel" aria-labelledby="week-title">
        <div className="panel-head">
          <div>
            <h2 id="week-title" className="section-title">Coming up</h2>
            <p className="muted">Jobs that started as a missed call. {s.vans} {Number(s.vans) === 1 ? 'van' : 'vans'} on the road, so up to {s.vans} jobs per slot.</p>
          </div>
        </div>
        {upcoming.length === 0 && <p className="week-free">Nothing booked from missed calls yet. New bookings show up here the moment the AI makes them.</p>}
        <div className="agenda">
          {[...new Set(upcoming.sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot)).map(l => new Date(l.slot).toDateString()))].map(key => {
            const d = new Date(key);
            const jobs = upcoming.filter(l => new Date(l.slot).toDateString() === key);
            const isToday = key === today.toDateString();
            const isTomorrow = key === new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toDateString();
            return (
              <div key={key} className={'agenda-day' + (isToday ? ' is-today' : '')}>
                <h3>{isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' })}<span>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span></h3>
                <div className="agenda-jobs">
                {jobs.map(l => (
                  <Link key={l.id} to={'/inbox/' + l.id} className={'job' + (l.urgent ? ' is-urgent' : '') + (Date.parse(l.slot) < now ? ' is-past' : '')}>
                    <span className="job-time">{l.urgent ? 'ASAP' : timeLabel(l.slot)}</span>
                    <strong>{l.issue}</strong>
                    <span className="job-who">{l.name || 'Customer'}, {l.zip || 'address on file'}</span>
                    <span className="job-foot">
                      <span className="job-by">{l.urgent ? <Siren size={13} weight="fill" /> : l.bookedBy === 'ai' ? <Robot size={13} weight="fill" /> : <User size={13} weight="fill" />}{l.bookedBy === 'ai' ? 'AI booked' : s.ownerName + ' booked'}</span>
                      <span className="job-value">{money(l.value, cur)}</span>
                    </span>
                  </Link>
                ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" aria-labelledby="recent-title">
        <div className="panel-head">
          <h2 id="recent-title" className="section-title">Booked in the last 30 days</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Booked</th><th>Customer</th><th>Job</th><th>Visit</th><th>Booked by</th><th className="num">Value</th></tr></thead>
            <tbody>
              {recent.map(l => (
                <tr key={l.id}>
                  <td className="nowrap">{stamp(l.bookedAt || l.createdAt, now)}</td>
                  <td><Link to={'/inbox/' + l.id}>{displayName(l)}</Link></td>
                  <td>{l.issue}{l.urgent ? ', emergency' : ''}</td>
                  <td className="nowrap">{stamp(l.slot, now)}</td>
                  <td>{l.bookedBy === 'ai' ? 'AI, ' + Math.max(1, Math.round((Date.parse(l.bookedAt) - Date.parse(l.createdAt)) / 60000)) + ' min after the call' : s.ownerName}</td>
                  <td className="num">{money(l.value, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
