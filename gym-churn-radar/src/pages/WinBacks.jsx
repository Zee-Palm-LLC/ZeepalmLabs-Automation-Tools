import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGym } from '../state/GymProvider.jsx';
import { money } from '../lib/format.js';
import CountUp from '../components/CountUp.jsx';
import Segmented from '../components/Segmented.jsx';
import LetterCard from '../components/LetterCard.jsx';

export default function WinBacks() {
  const { data } = useGym();
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const { stats, gym } = data;
  const letters = data.outreach;
  const back = letters.filter(l => l.cameBack);
  const waiting = letters.filter(l => !l.cameBack);
  const list = filter === 'back' ? back : filter === 'waiting' ? waiting : letters;
  const funnel = [
    { label: 'Emails sent in 90 days', value: stats.emailsTotal90Days },
    { label: 'Members who came back', value: back.length },
    { label: 'Win-back rate', value: stats.winbackRatePercent ?? 0, suffix: '%' },
    { label: 'Monthly revenue won back', value: stats.monthlyRevenueWonBackLast30Days, money: true }
  ];
  const maxBar = Math.max(1, stats.emailsTotal90Days);

  return (
    <>
      <section className="funnel">
        {funnel.map((f, i) => (
          <motion.div key={f.label} className="funnel-step" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.45 }}>
            <p className="funnel-value">
              <CountUp value={f.value} format={f.money ? v => money(v, gym.currency) : undefined} />
              {f.suffix}
            </p>
            <p className="muted">{f.label}</p>
            {i < 2 && (
              <span className="funnel-track">
                <motion.span className={'funnel-fill fill-' + i} initial={{ width: 0 }} animate={{ width: (100 * f.value) / maxBar + '%' }} transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] }} />
              </span>
            )}
          </motion.div>
        ))}
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Every email Claude wrote</h2>
            <p className="muted">Tap an email to read it in full. Outcomes update as members check in.</p>
          </div>
          <Segmented
            id="letters"
            label="Filter emails"
            value={filter}
            onChange={f => { setFilter(f); setOpen(null); }}
            options={[
              { value: 'all', label: 'All', count: letters.length },
              { value: 'back', label: 'Came back', count: back.length },
              { value: 'waiting', label: 'Waiting', count: waiting.length }
            ]}
          />
        </header>
        {list.length ? (
          <motion.ul className="letters letters-grid" layout>
            <AnimatePresence mode="popLayout">
              {list.map((l, i) => {
                const key = l.ref + l.sentAt;
                return <LetterCard key={key} letter={l} index={i} expanded={open === key} onToggle={() => setOpen(open === key ? null : key)} />;
              })}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <div className="empty-block"><strong>Nothing here yet</strong><p>Win-back emails appear after a scan finds high-risk members.</p></div>
        )}
      </section>
    </>
  );
}
