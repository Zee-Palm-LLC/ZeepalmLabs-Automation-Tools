import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlass, SignIn, Check, X } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { initials, lastSeen, money, statusLabel, todayKey } from '../lib/format.js';
import Segmented from '../components/Segmented.jsx';
import Plate from '../components/Plate.jsx';

const SORTS = {
  risk: { label: 'Highest risk', fn: (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.fee - a.fee },
  value: { label: 'Highest value', fn: (a, b) => b.fee - a.fee },
  quiet: { label: 'Longest away', fn: (a, b) => (b.daysSinceVisit ?? 999) - (a.daysSinceVisit ?? 999) },
  name: { label: 'Name A to Z', fn: (a, b) => a.name.localeCompare(b.name) }
};

export default function Members() {
  const { data, openMember, checkIn } = useGym();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [sort, setSort] = useState('risk');
  const today = todayKey();
  const cur = data.gym.currency;

  const counts = useMemo(() => {
    const c = { active: 0, frozen: 0, cancelled: 0 };
    for (const m of data.members) c[m.status] = (c[m.status] || 0) + 1;
    return c;
  }, [data.members]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.members
      .filter(m => status === 'all' || m.status === status)
      .filter(m => !q || [m.name, m.email, m.ref, m.plan, m.trainer].some(v => String(v || '').toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [data.members, query, status, sort]);

  const mrr = rows.reduce((a, m) => a + m.fee, 0);

  return (
    <section className="card">
      <div className="toolbar">
        <label className="search">
          <MagnifyingGlass size={18} weight="bold" />
          <input type="search" placeholder="Search by name, email, plan or trainer" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search members" />
          {query && <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} weight="bold" /></button>}
        </label>
        <Segmented
          id="status"
          label="Membership status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'frozen', label: 'Frozen', count: counts.frozen },
            { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            { value: 'all', label: 'All', count: data.members.length }
          ]}
        />
        <label className="select">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <p className="table-summary muted">
        {rows.length} {rows.length === 1 ? 'member' : 'members'} worth {money(mrr, cur)} a month
      </p>

      <div className="table" role="table" aria-label="Members">
        <div className="tr th" role="row">
          <span role="columnheader">Member</span>
          <span role="columnheader">Plan</span>
          <span role="columnheader">Last visit</span>
          <span role="columnheader" className="num">Visits 30d</span>
          <span role="columnheader" className="num">Risk</span>
          <span role="columnheader">Status</span>
          <span role="columnheader" className="sr-only">Check in</span>
        </div>
        <motion.div layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {rows.map((m, i) => {
              const inToday = m.recentVisits.includes(today);
              return (
                <motion.div
                  key={m.ref}
                  layout
                  role="row"
                  className="tr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.35, delay: Math.min(i, 14) * 0.022 }}
                  onClick={() => openMember(m.ref)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') openMember(m.ref); }}
                >
                  <span role="cell" className="cell-member">
                    <span className="avatar" data-level={m.level}>{initials(m.name)}</span>
                    <span>
                      <strong>{m.name}</strong>
                      <small>{m.email || m.ref}</small>
                    </span>
                  </span>
                  <span role="cell"><strong>{m.plan || 'No plan'}</strong><small>{money(m.fee, cur)}/mo</small></span>
                  <span role="cell" className={m.daysSinceVisit != null && m.daysSinceVisit >= 14 ? 'warn' : ''}>{lastSeen(m)}</span>
                  <span role="cell" className="num">{m.visits30 ?? '–'}</span>
                  <span role="cell" className="num"><Plate score={m.score} level={m.level} size="xs" /></span>
                  <span role="cell"><span className={'status-chip status-' + m.status}>{statusLabel[m.status] || m.status}</span></span>
                  <span role="cell" className="cell-action">
                    {m.status === 'active' && (
                      <motion.button
                        type="button"
                        className={'chip-btn' + (inToday ? ' is-done' : '')}
                        whileTap={{ scale: 0.9 }}
                        disabled={inToday}
                        onClick={e => { e.stopPropagation(); checkIn(m); }}
                        aria-label={inToday ? m.name + ' is checked in today' : 'Check in ' + m.name}
                      >
                        {inToday ? <Check size={16} weight="bold" /> : <SignIn size={16} weight="bold" />}
                        <span>{inToday ? 'In today' : 'Check in'}</span>
                      </motion.button>
                    )}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
        {!rows.length && <div className="empty-block"><strong>No members match</strong><p>Try a different search or status.</p></div>}
      </div>
    </section>
  );
}
