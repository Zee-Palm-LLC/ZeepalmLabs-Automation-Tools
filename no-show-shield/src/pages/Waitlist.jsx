import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Star, Trash, ListChecks, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, Avatar, Segmented, Empty, Pill } from '../components/ui.jsx';
import OfferBoard from '../components/OfferBoard.jsx';
import { displayName, typeOf, providerOf, WINDOWS, WEEKDAYS, money } from '../lib/format.js';

export default function Waitlist() {
  const { data, now, act, busy, stats: st } = useDesk();
  const [filter, setFilter] = useState('waiting');
  const [q, setQ] = useState('');
  const S = data.settings;
  const live = data.offers.filter(o => o.status === 'open' && Date.parse(o.sentAt) <= now + 2000).sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  const recent = data.offers.filter(o => o.status !== 'open' && Date.parse(o.sentAt) <= now).sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt)).slice(0, live.length ? 2 : 3);
  const entries = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.waitlist
      .filter(w => (filter === 'waiting' ? w.status === 'waiting' || w.status === 'offered' : filter === 'booked' ? w.status === 'booked' : w.status !== 'removed'))
      .map(w => ({ w, p: data.patients.find(x => x.id === w.patientId) }))
      .filter(x => x.p && (!needle || x.p.name.toLowerCase().includes(needle)))
      .sort((a, b) => (b.w.priority - a.w.priority) || Date.parse(a.w.addedAt) - Date.parse(b.w.addedAt));
  }, [data, filter, q]);

  return (
    <div className="wait">
      <div className="wait-offers">
        <div className="wait-offers-head">
          <h2 className="section-title">Open times</h2>
          <p>{live.length ? live.length + ' being offered right now. The first YES gets it.' : 'Nothing being offered right now. Cancel a visit in the schedule to watch one fill.'}</p>
        </div>
        <div className="offer-grid">
          <AnimatePresence initial={false}>
            {[...live, ...recent].map(o => (
              <motion.div key={o.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <OfferBoard offer={o} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Card
        title="Waitlist"
        sub={st.waiting + ' patients want an earlier visit. Urgent ones are offered first, then whoever has waited longest.'}
        pad={false}
        action={
          <div className="wait-tools">
            <label className="search-field sm">
              <MagnifyingGlass size={14} weight="bold" aria-hidden="true" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search the waitlist" />
            </label>
            <Segmented size="sm" label="Show" value={filter} onChange={setFilter} options={[{ value: 'waiting', label: 'Waiting' }, { value: 'booked', label: 'Booked' }, { value: 'all', label: 'All' }]} />
          </div>
        }
      >
        {entries.length === 0 ? (
          <Empty icon={ListChecks} title="Nobody here">No one matches this filter.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Patient</th><th>Wants</th><th>When</th><th>With</th><th className="num">Waiting</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {entries.map(({ w, p }) => {
                    const t = typeOf(S, w.type);
                    const days = Math.max(1, Math.round(((w.bookedAt ? Date.parse(w.bookedAt) : now) - Date.parse(w.addedAt)) / 86400000));
                    return (
                      <motion.tr key={w.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td><span className="cell-who"><Avatar patient={p} size={28} /><span><Link to={'/inbox/' + p.id}><strong>{displayName(p)}</strong></Link><em>{w.note || (p.noShows ? p.noShows + ' past no-show' + (p.noShows > 1 ? 's' : '') : p.visits + ' visits')}</em></span></span></td>
                        <td><span className="cell-two"><strong>{t.name}</strong><em>{t.minutes} min, {money(t.value)}</em></span></td>
                        <td>{WINDOWS[w.window]}{w.days && w.days.length ? ', ' + w.days.map(d => WEEKDAYS[d]).join(' and ') : ''}</td>
                        <td>{w.provider === 'any' ? 'Anyone' : providerOf(S, w.provider).short}</td>
                        <td className="num mono">{days}d</td>
                        <td>
                          {w.status === 'booked' ? <Pill tone="refill" size="sm">Booked</Pill> : w.status === 'offered' ? <Pill tone="live" size="sm">Offer sent</Pill> : w.priority ? <Pill tone="bad" size="sm">Urgent</Pill> : <Pill tone="wait" size="sm">Waiting</Pill>}
                        </td>
                        <td className="row-actions">
                          {w.status !== 'booked' && (
                            <>
                              <button type="button" className={'icon-btn sm' + (w.priority ? ' on star' : '')} disabled={busy} onClick={() => act('waitlist-priority', { wait: w.id }, w.priority ? 'No longer urgent' : 'Marked as urgent')} aria-label={w.priority ? 'Remove urgent' : 'Mark as urgent'}><Star size={15} weight={w.priority ? 'fill' : 'regular'} /></button>
                              <button type="button" className="icon-btn sm" disabled={busy} onClick={() => act('waitlist-remove', { wait: w.id }, displayName(p) + ' removed from the waitlist')} aria-label="Remove from the waitlist"><Trash size={15} /></button>
                            </>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="wait-foot"><ArrowsClockwise size={14} weight="bold" /> Offers go to the top {S.offerBatch} matches at once and stay open for {S.offerMinutes} minutes. Times less than {S.minNoticeHours} hours away are not offered.</p>
    </div>
  );
}
