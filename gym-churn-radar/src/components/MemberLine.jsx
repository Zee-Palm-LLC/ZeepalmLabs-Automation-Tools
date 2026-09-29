import { motion } from 'motion/react';
import { useGym } from '../state/GymProvider.jsx';
import { lastSeen, money, ago } from '../lib/format.js';
import Pulse from './Pulse.jsx';
import Plate from './Plate.jsx';

export default function MemberLine({ member, index = 0, compact = false }) {
  const { openMember, data } = useGym();
  return (
    <motion.li
      layout
      className={'member-line' + (compact ? ' is-compact' : '')}
      data-level={member.level}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 12) * 0.035 }}
    >
      <button type="button" className="member-line-button" onClick={() => openMember(member.ref)}>
        <span className="who">
          <span className="who-name">
            {member.name}
            {member.cameBack && <span className="tag tag-back">Came back</span>}
            {!member.cameBack && member.lastOutreachAt && <span className="tag tag-mailed">Emailed {ago(member.lastOutreachAt)}</span>}
          </span>
          <span className="who-meta">{member.plan}, {money(member.fee, data.gym.currency)}/mo, {lastSeen(member).toLowerCase()}</span>
        </span>
        <Pulse member={member} size={compact ? 'sm' : 'md'} />
        <Plate score={member.score} level={member.level} size={compact ? 'sm' : 'md'} delay={0.2 + Math.min(index, 12) * 0.04} />
      </button>
    </motion.li>
  );
}
