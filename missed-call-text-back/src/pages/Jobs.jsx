import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Robot, User, Siren, CalendarCheck, Timer, CurrencyDollar, CalendarBlank, MapPin, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, Avatar, Empty } from '../components/ui.jsx';
import { Ring } from '../components/charts.jsx';
import { Stat } from './Calls.jsx';
import { money, timeLabel, displayName, stamp, minutes } from '../lib/format.js';
import { serviceMix, medianMinutesToBook } from '../lib/metrics.js';

const DAY = 86400000;

export default function Jobs() {
  const { data, now } = useDesk();
  const [day, setDay] = useState('all');
  const [page, setPage] = useState(0);
  const s = data.settings;
  const cur = s.currency;
  const minute = Math.floor(now / 60000);
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const booked = data.leads.filter(l => l.status === 'booked' && l.slot);
  const upcoming = booked.filter(l => Date.parse(l.slot) >= start).sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot));
  const recent = booked.filter(l => Date.parse(l.createdAt) >= now - 30 * DAY).sort((a, b) => Date.parse(b.bookedAt || b.slot) - Date.parse(a.bookedAt || a.slot));
  const byAi = recent.filter(l => l.bookedBy === 'ai').length;
  const value = recent.reduce((a, l) => a + (Number(l.value) || 0), 0);
  const median = useMemo(() => medianMinutesToBook(data, now), [data, minute]);
  const mix = useMemo(() => serviceMix(data, now), [data, minute]);
  const topMix = Math.max(1, ...mix.map(m => m.value));

  const days = [];
  for (let i = 0; days.length < 7 && i < 10; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (d.getDay() !== 0) days.push(d);
  }
  const shown = day === 'all' ? upcoming : upcoming.filter(l => new Date(l.slot).toDateString() === day);
  const groups = [...new Set(shown.map(l => new Date(l.slot).toDateString()))];
  const dayName = d => {
    const t = new Date(d).toDateString();
    if (t === today.toDateString()) return 'Today';
    if (t === new Date(start + DAY).toDateString()) return 'Tomorrow';
    return new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
  };

  return (
    <div className="page-stack">
      <div className="kpis">
        <Stat icon={CalendarCheck} tone="green" label="Jobs booked" value={recent.length} sub="from missed calls, last 30 days" />
        <Stat icon={Robot} tone="violet" label="Booked by the AI" value={byAi} sub="no call back needed" />
        <Stat icon={Timer} tone="blue" label="Call to booking" value={median} format={v => Math.round(v) + ' min'} sub="median, when the AI books" />
        <Stat icon={CurrencyDollar} tone="amber" label="Value of those jobs" value={value} format={v => money(v, cur)} sub="at typical job prices" />
      </div>

      <div className="dash-row two-one">
        <Card title="Coming up" sub={s.vans + (Number(s.vans) === 1 ? ' van' : ' vans') + ' on the road, so up to ' + s.vans + ' jobs per slot'} className="agenda-card">
          <div className="day-strip" role="tablist" aria-label="Pick a day">
            <button type="button" role="tab" aria-selected={day === 'all'} className={'day-chip' + (day === 'all' ? ' on' : '')} onClick={() => setDay('all')}>
              <span>All</span><strong>{upcoming.length}</strong>
            </button>
            {days.map(d => {
              const key = d.toDateString();
              const n = upcoming.filter(l => new Date(l.slot).toDateString() === key).length;
              return (
                <button key={key} type="button" role="tab" aria-selected={day === key} className={'day-chip' + (day === key ? ' on' : '') + (n ? ' has' : '')} onClick={() => setDay(key)}>
                  <span>{key === today.toDateString() ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <strong>{d.getDate()}</strong>
                  <i>{n ? n + (n === 1 ? ' job' : ' jobs') : 'free'}</i>
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={day} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {groups.length === 0 && <Empty icon={CalendarBlank} title="Nothing booked yet">New bookings show up here the moment the AI makes them.</Empty>}
              {groups.map(key => {
                const jobs = shown.filter(l => new Date(l.slot).toDateString() === key);
                return (
                  <div key={key} className="agenda-day">
                    <h3>{dayName(key)}<span>{new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></h3>
                    <div className="agenda-jobs">
                      {jobs.map(l => (
                        <Link key={l.id} to={'/inbox/' + l.id} className={'job' + (l.urgent ? ' is-urgent' : '') + (Date.parse(l.slot) < now ? ' is-past' : '')}>
                          <div className="job-top">
                            <span className="job-time">{l.urgent ? 'ASAP' : timeLabel(l.slot)}</span>
                            <span className="job-value">{money(l.value, cur)}</span>
                          </div>
                          <strong>{l.issue}</strong>
                          <span className="job-who"><Avatar lead={l} size={20} /> {l.name || 'Customer'}</span>
                          <span className="job-meta">
                            <span><MapPin size={12} weight="fill" /> {l.zip || 'Address on file'}</span>
                            <span className="job-by">{l.urgent ? <Siren size={12} weight="fill" /> : l.bookedBy === 'ai' ? <Robot size={12} weight="fill" /> : <User size={12} weight="fill" />}{l.bookedBy === 'ai' ? 'AI booked' : s.ownerName + ' booked'}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </Card>

        <div className="stack-col">
          <Card title="Who booked the work" sub="Last 30 days">
            <div className="split">
              <Ring value={recent.length ? byAi / recent.length : 0} size={112} stroke={10} color="var(--violet)">
                <strong>{recent.length ? Math.round((byAi / recent.length) * 100) : 0}%</strong>
                <span>by the AI</span>
              </Ring>
              <ul className="split-legend">
                <li><i className="sw sw-violet" /> AI, from the text thread <b>{byAi}</b></li>
                <li><i className="sw sw-muted" /> {s.ownerName}, on a call back <b>{recent.length - byAi}</b></li>
              </ul>
            </div>
          </Card>
          <Card title="Value by service" sub="Jobs booked from missed calls">
            {mix.length === 0 ? <Empty icon={CurrencyDollar} title="No bookings yet" /> : (
              <ul className="hbars">
                {mix.map((m, i) => (
                  <li key={m.key}>
                    <div className="hbar-row"><span>{m.name}</span><b>{money(m.value, cur)}</b></div>
                    <div className="hbar-track"><motion.div className="hbar-fill" initial={{ width: 0 }} animate={{ width: (m.value / topMix) * 100 + '%' }} transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }} /></div>
                    <span className="hbar-sub">{m.count} {m.count === 1 ? 'job' : 'jobs'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Booked in the last 30 days" sub={recent.length + ' jobs'} pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Booked</th><th>Customer</th><th>Job</th><th>Visit</th><th>Booked by</th><th className="num">Value</th></tr></thead>
            <tbody>
              {recent.slice(page * 10, page * 10 + 10).map(l => (
                <tr key={l.id}>
                  <td className="nowrap muted">{stamp(l.bookedAt || l.createdAt, now)}</td>
                  <td><span className="cell-who"><Avatar lead={l} size={28} /><Link to={'/inbox/' + l.id}>{displayName(l)}</Link></span></td>
                  <td>{l.issue}{l.urgent ? <span className="tag tag-amber">Emergency</span> : null}</td>
                  <td className="nowrap">{stamp(l.slot, now)}</td>
                  <td>{l.bookedBy === 'ai' ? <span className="tag tag-violet"><Robot size={11} weight="fill" /> AI, {minutes((Date.parse(l.bookedAt) - Date.parse(l.createdAt)) / 60000)} after the call</span> : <span className="tag">{s.ownerName}</span>}</td>
                  <td className="num strong">{money(l.value, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span className="muted">{recent.length ? page * 10 + 1 + ' to ' + Math.min(recent.length, page * 10 + 10) + ' of ' + recent.length : ''}</span>
          <div className="pager-btns">
            <button type="button" className="icon-btn" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><CaretLeft size={15} weight="bold" /></button>
            <span className="pager-num">{page + 1} / {Math.max(1, Math.ceil(recent.length / 10))}</span>
            <button type="button" className="icon-btn" disabled={(page + 1) * 10 >= recent.length} onClick={() => setPage(page + 1)} aria-label="Next page"><CaretRight size={15} weight="bold" /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}
