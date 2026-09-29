import { motion } from 'motion/react';

const SIZES = { xs: 36, sm: 44, md: 56, lg: 104 };

export default function Plate({ score, level, size = 'md', delay = 0 }) {
  const px = SIZES[size] || SIZES.md;
  const stroke = size === 'lg' ? 7 : size === 'xs' ? 3.5 : 4.5;
  const r = (px - stroke) / 2 - 1;
  const value = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const label = score == null ? 'Not scored' : 'Risk score ' + score;
  return (
    <span className={'plate plate-' + size} data-level={level} aria-label={label} title={label} style={{ width: px, height: px }}>
      <svg viewBox={'0 0 ' + px + ' ' + px} width={px} height={px} aria-hidden="true">
        <circle cx={px / 2} cy={px / 2} r={r} className="plate-track" strokeWidth={stroke} fill="none" />
        <motion.circle
          key={score ?? 'none'}
          cx={px / 2}
          cy={px / 2}
          r={r}
          className="plate-ring"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          transform={'rotate(-90 ' + px / 2 + ' ' + px / 2 + ')'}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
        />
      </svg>
      <motion.span
        key={'n' + (score ?? 'none')}
        className="plate-num"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18, delay: delay + 0.15 }}
      >
        {score == null ? '–' : score}
      </motion.span>
    </span>
  );
}
