import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { PhoneIncoming, PhoneX, MoonStars, Lightning, MagnifyingGlass, CaretUp, CaretDown, CaretLeft, CaretRight, Lightbulb } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, StatusPill, Segmented, Avatar, CountUp, Empty } from '../components/ui.jsx';
import { Heatmap } from '../components/charts.jsx';
import { phone, stamp, duration, displayName, timeLabel } from '../lib/format.js';

const PAGE = 12;
const hourLabel = h => timeLabel(new Date(2000, 0, 1, h).getTime());

export default function Calls() {
  const { data, now } = useDesk();
  const [filter, setFilter] = useState('missed');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'at', dir: -1 });
  const [page, setPage] = useState(0);
  const st = data.stats;
  const leads = useMemo(() => Object.fromEntries(data.leads.map(l => [l.id, l])), [data.leads]);
  const since = now - 30 * 86400000;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.calls
      .filter(c => Date.parse(c.at) >= since && Date.parse(c.at) <= now)
      .filter(c => filter === 'all' || (filter === 'missed' ? c.outcome !== 'answered' : c.outcome === 'answered'))
      .map(c => ({ ...c, lead: c.leadId ? leads[c.leadId] : null }))
      .filter(c => !needle || [c.phone, phone(c.phone), c.lead && c.lead.name, c.lead && c.lead.issue].some(v => v && String(v).toLowerCase().includes(needle)));
    const val = c => {
      if (sort.key === 'at') return Date.parse(c.at);
      if (sort.key === 'caller') return (c.lead && c.lead.name) || c.phone;
      if (sort.key === 'textback') return c.textBackSeconds == null ? 9999 : c.textBackSeconds;
      if (sort.key === 'status') return c.lead ? c.lead.status : 'zz';
      return 0;
    };
    return list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [data.calls, leads, filter, q, sort, since, now]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  let best = null;
  for (let h = 6; h <= 19; h++) {
    const sum = [1, 2, 3, 4, 5].reduce((a, d) => a + st.heat[d][h] + st.heat[d][h + 1] + st.heat[d][h + 2], 0);
    if (!best || sum > best.sum) best = { h, sum };
  }

  const sortBy = key => {
    setSort(s => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'at' ? -1 : 1 }));
    setPage(0);
  };
  const Th = ({ k, children, className }) => (
    <th className={className} aria-sort={sort.key === k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={'th-sort' + (sort.key === k ? ' on' : '')} onClick={() => sortBy(k)}>
        {children}
        {sort.key === k ? (sort.dir > 0 ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />) : <CaretDown size={11} weight="bold" className="faint" />}
      </button>
    </th>
  );

  return (
    <div className="page-stack">
      <div className="kpis">
        <Stat icon={PhoneIncoming} tone="blue" label="Calls" value={st.calls} sub="to the business line" />
        <Stat icon={PhoneIncoming} tone="green" label="Answered" value={st.answered} sub={Math.round((st.answered / Math.max(1, st.calls)) * 100) + '% picked up'} />
        <Stat icon={PhoneX} tone="red" label="Missed" value={st.missed} sub={st.afterHours + ' after hours'} />
        <Stat icon={Lightning} tone="violet" label="Text-back speed" value={st.avgTextBack} format={v => v.toFixed(1) + 's'} sub="average after a missed call" />
      </div>

      <Card title="When calls get missed" sub="Missed calls by weekday and hour, last 30 days" action={best && best.sum > 0 ? (
        <span className="insight"><Lightbulb size={14} weight="fill" /> {Math.round((best.sum / Math.max(1, st.missed)) * 100)}% land on weekdays {hourLabel(best.h)} to {hourLabel(best.h + 3)}</span>
      ) : null}>
        <Heatmap heat={st.heat} hourLabel={hourLabel} />
      </Card>

      <Card title="Call log" sub={rows.length + ' calls'} pad={false} action={
        <div className="table-tools">
          <label className="search-field sm">
            <MagnifyingGlass size={14} weight="bold" aria-hidden="true" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Search callers" aria-label="Search calls" />
          </label>
          <Segmented size="sm" label="Filter calls" value={filter} onChange={v => { setFilter(v); setPage(0); }} options={[{ value: 'missed', label: 'Missed' }, { value: 'answered', label: 'Answered' }, { value: 'all', label: 'All' }]} />
        </div>
      }>
        {shown.length === 0 ? <Empty icon={MagnifyingGlass} title="No calls match" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><Th k="at">When</Th><Th k="caller">Caller</Th><th>Call</th><Th k="textback">Text back</Th><Th k="status">What happened</Th></tr>
              </thead>
              <tbody>
                {shown.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                    <td className="nowrap muted">{stamp(c.at, now)}</td>
                    <td>
                      <span className="cell-who">
                        <Avatar lead={c.lead || { phone: c.phone }} size={28} />
                        {c.lead ? <Link to={'/inbox/' + c.lead.id}>{displayName(c.lead)}</Link> : <span>{phone(c.phone)}</span>}
                      </span>
                    </td>
                    <td>{c.outcome === 'answered' ? <span className="tag tag-green">Answered, {duration(c.duration)}</span> : <span className="tag tag-red">{c.outcome === 'after_hours' ? 'Missed after hours' : 'Missed'}</span>}</td>
                    <td>{c.textBackSeconds != null ? <span className="speed"><Lightning size={12} weight="fill" /> {c.textBackSeconds}s</span> : <span className="muted">{c.note || 'Not needed'}</span>}</td>
                    <td>{c.lead ? <span className="cell-what"><StatusPill status={c.lead.status} urgent={c.lead.urgent} size="sm" />{c.lead.issue && <span className="muted">{c.lead.issue}</span>}</span> : <span className="muted">Talked on the phone</span>}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          <span className="muted">{rows.length ? cur * PAGE + 1 + ' to ' + Math.min(rows.length, cur * PAGE + PAGE) + ' of ' + rows.length : ''}</span>
          <div className="pager-btns">
            <button type="button" className="icon-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page"><CaretLeft size={15} weight="bold" /></button>
            <span className="pager-num">{cur + 1} / {pages}</span>
            <button type="button" className="icon-btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page"><CaretRight size={15} weight="bold" /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function Stat({ icon: Icon, tone, label, value, format, sub }) {
  return (
    <div className={'kpi kpi-' + tone + ' kpi-compact'}>
      <div className="kpi-top">
        <span className="kpi-icon"><Icon size={17} weight="fill" /></span>
        <span className="kpi-label">{label}</span>
      </div>
      <strong className="kpi-value"><CountUp value={value} format={format} /></strong>
      <div className="kpi-foot"><span>{sub}</span></div>
    </div>
  );
}
