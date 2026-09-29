import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGym } from '../state/GymProvider.jsx';
import Segmented from '../components/Segmented.jsx';
import MemberLine from '../components/MemberLine.jsx';

export default function Radar() {
  const { data, busy, runScan } = useGym();
  const [filter, setFilter] = useState('risk');
  const active = data.members.filter(m => m.status === 'active');
  const risky = active.filter(m => m.level === 'high' || m.level === 'medium');
  const back = active.filter(m => m.cameBack);
  const list = filter === 'risk' ? risky : filter === 'back' ? back : active;
  const scanning = busy === 'scan';

  return (
    <section className="card radar">
      <header className="card-head">
        <div>
          <h2>Attendance board</h2>
          <p className="muted">Black bars are visits. A red tick is the day a win-back email went out. Blue bars are visits after it.</p>
        </div>
        <Segmented
          id="radar"
          label="Filter members"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'risk', label: 'At risk', count: risky.length },
            { value: 'back', label: 'Came back', count: back.length },
            { value: 'all', label: 'Everyone', count: active.length }
          ]}
        />
      </header>
      <div className="board-scale" aria-hidden="true"><span>8 weeks ago</span><span>Today</span></div>
      <div className={'board' + (scanning ? ' is-scanning' : '')}>
        <AnimatePresence>
          {scanning && (
            <motion.div
              className="sweep"
              aria-hidden="true"
              initial={{ left: '-12%', opacity: 0 }}
              animate={{ left: ['-12%', '104%'], opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ left: { duration: 2.2, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.3 } }}
            />
          )}
        </AnimatePresence>
        {list.length ? (
          <motion.ul className="member-list" layout>
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((m, i) => <MemberLine key={m.ref} member={m} index={i} />)}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <div className="empty-block">
            {filter === 'risk' && !data.stats.scoredMembers ? (
              <>
                <strong>Nobody has been scored yet</strong>
                <p>Run a scan and watch the radar find who is slipping away.</p>
                <button type="button" className="btn btn-primary" onClick={runScan} disabled={!!busy}>Run scan now</button>
              </>
            ) : filter === 'risk' ? (
              <><strong>No one is at risk</strong><p>Every active member is visiting at their usual rhythm.</p></>
            ) : filter === 'back' ? (
              <><strong>No returns yet</strong><p>Members who visit within 14 days of a win-back email appear here.</p></>
            ) : (
              <><strong>No active members</strong><p>Upload your members list from the Check-ins page.</p></>
            )}
          </div>
        )}
      </div>
      <ul className="legend" aria-label="Legend">
        <li className="lg lg-high">High risk</li>
        <li className="lg lg-medium">Medium</li>
        <li className="lg lg-low">Steady</li>
        <li className="lg lg-back">Came back</li>
        <li className="lg lg-mail">Win-back email sent</li>
      </ul>
    </section>
  );
}
