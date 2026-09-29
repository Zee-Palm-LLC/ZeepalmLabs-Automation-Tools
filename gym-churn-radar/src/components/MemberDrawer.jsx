import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, SignIn, Snowflake, XCircle, ArrowCounterClockwise, EnvelopeSimple, Phone } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { lastSeen, levelLabel, money, monthYear, statusLabel, initials, ago, todayKey } from '../lib/format.js';
import Plate from './Plate.jsx';
import Pulse from './Pulse.jsx';

export default function MemberDrawer() {
  const { selected, closeMember } = useGym();

  useEffect(() => {
    if (!selected) return;
    const onKey = e => { if (e.key === 'Escape') closeMember(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, closeMember]);

  return (
    <AnimatePresence>
      {selected && (
        <>
          <motion.div
            key="backdrop"
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMember}
          />
          <motion.aside
            key="drawer"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            initial={{ x: '104%' }}
            animate={{ x: 0 }}
            exit={{ x: '104%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <DrawerBody key={selected.ref} member={selected} onClose={closeMember} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerBody({ member, onClose }) {
  const { data, checkIn, changeStatus } = useGym();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const currency = data.gym.currency;
  const letter = data.outreach.find(l => l.ref === member.ref);
  const inToday = member.recentVisits.includes(todayKey());
  const active = member.status === 'active';

  return (
    <div className="drawer-inner">
      <header className="drawer-head">
        <span className="avatar avatar-lg" data-level={member.level}>{initials(member.name)}</span>
        <div className="drawer-title">
          <h2>{member.name}</h2>
          <p>{member.plan} membership, {money(member.fee, currency)}/mo</p>
          <span className={'status-chip status-' + member.status}>{statusLabel[member.status] || member.status}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} weight="bold" /></button>
      </header>

      <section className="drawer-score">
        <Plate score={member.score} level={member.level} size="lg" delay={0.15} />
        <div>
          <p className="drawer-level" data-level={member.level}>{levelLabel[member.level]}</p>
          <p className="muted">{lastSeen(member)}. {member.visits30 == null ? '' : member.visits30 + ' visits in the last 30 days.'}</p>
        </div>
      </section>

      <section className="drawer-section">
        <h3>Last 8 weeks</h3>
        <Pulse member={member} size="lg" />
        <div className="scale"><span>8 weeks ago</span><span>Today</span></div>
      </section>

      <section className="drawer-section">
        <h3>Why the radar flagged them</h3>
        {member.reasons.length ? (
          <ul className="reasons">
            {member.reasons.map((r, i) => (
              <motion.li key={r} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07 }}>{r}</motion.li>
            ))}
          </ul>
        ) : (
          <p className="muted">{member.level === 'unscored' ? 'Not scored yet. Run a scan from the top bar.' : 'Visiting at their usual rhythm. Nothing to worry about.'}</p>
        )}
      </section>

      {letter && (
        <section className="drawer-section">
          <h3>Win-back email, {ago(letter.sentAt)}</h3>
          <div className="mail-preview">
            <strong>{letter.subject}</strong>
            <p>{letter.message}</p>
            <span className={'outcome ' + (letter.cameBack ? 'outcome-back' : 'outcome-wait')}>
              {letter.cameBack ? 'Came back after ' + letter.daysToReturn + (letter.daysToReturn === 1 ? ' day' : ' days') : 'Waiting for a visit'}
            </span>
          </div>
        </section>
      )}

      <section className="drawer-section facts">
        <div><span>Member since</span><strong>{monthYear(member.joinDate)}</strong></div>
        <div><span>Trainer</span><strong>{member.trainer || 'None'}</strong></div>
        <div><span>Win-back emails</span><strong>{member.outreachCount}</strong></div>
        <div><span>Member ID</span><strong>{member.ref}</strong></div>
        {member.email && <div className="wide"><span><EnvelopeSimple size={14} /> Email</span><a href={'mailto:' + member.email}>{member.email}</a></div>}
        {member.phone && <div className="wide"><span><Phone size={14} /> Phone</span><a href={'tel:' + member.phone}>{member.phone}</a></div>}
      </section>

      <footer className="drawer-actions">
        {active && (
          <motion.button whileTap={{ scale: 0.96 }} type="button" className="btn btn-primary" disabled={inToday} onClick={() => checkIn(member)}>
            <SignIn size={18} weight="bold" /> {inToday ? 'Checked in today' : 'Check in now'}
          </motion.button>
        )}
        {active ? (
          <motion.button whileTap={{ scale: 0.96 }} type="button" className="btn btn-quiet" onClick={() => changeStatus(member, 'frozen')}>
            <Snowflake size={18} weight="bold" /> Freeze
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.96 }} type="button" className="btn btn-primary" onClick={() => changeStatus(member, 'active')}>
            <ArrowCounterClockwise size={18} weight="bold" /> Reactivate
          </motion.button>
        )}
        {member.status !== 'cancelled' && (
          confirmCancel ? (
            <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} type="button" className="btn btn-danger" onClick={() => { setConfirmCancel(false); changeStatus(member, 'cancelled'); }}>
              <XCircle size={18} weight="bold" /> Confirm cancel
            </motion.button>
          ) : (
            <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmCancel(true)}>Cancel membership</button>
          )
        )}
      </footer>
    </div>
  );
}
