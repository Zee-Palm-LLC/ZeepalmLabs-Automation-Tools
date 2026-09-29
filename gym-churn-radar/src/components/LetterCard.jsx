import { motion } from 'motion/react';
import { ArrowUUpLeft, Hourglass } from '@phosphor-icons/react';
import { ago } from '../lib/format.js';

export default function LetterCard({ letter, expanded = false, onToggle, index = 0 }) {
  const back = letter.cameBack;
  return (
    <motion.li
      layout
      className={'letter' + (expanded ? ' is-expanded' : '')}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.05 }}
    >
      <button type="button" className="letter-button" onClick={onToggle} aria-expanded={expanded}>
        <span className="letter-head">
          <span>To <b>{letter.name}</b></span>
          <span>{ago(letter.sentAt)}</span>
        </span>
        <span className="letter-subject">{letter.subject}</span>
        <motion.span layout="position" className="letter-body">{letter.message}</motion.span>
        <span className={'outcome ' + (back ? 'outcome-back' : 'outcome-wait')}>
          {back ? <ArrowUUpLeft size={14} weight="bold" /> : <Hourglass size={14} weight="bold" />}
          {back
            ? 'Came back ' + (letter.daysToReturn === 0 ? 'the same day' : 'after ' + letter.daysToReturn + (letter.daysToReturn === 1 ? ' day' : ' days'))
            : 'Waiting for a visit'}
        </span>
      </button>
    </motion.li>
  );
}
