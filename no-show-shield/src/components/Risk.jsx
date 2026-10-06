import { motion, AnimatePresence } from 'motion/react';
import { CountUp } from './ui.jsx';

export function RiskMeter({ risk, compact = false }) {
  const label = risk.level === 'high' ? 'High risk' : risk.level === 'medium' ? 'Some risk' : 'Low risk';
  return (
    <div className={'riskm riskm-' + risk.level + (compact ? ' is-compact' : '')}>
      <div className="riskm-top">
        <strong className="riskm-score"><CountUp value={risk.score} duration={0.9} /></strong>
        <span className="riskm-label">
          <b>{label}</b>
          <em>chance of a no-show, out of 100</em>
        </span>
      </div>
      <div className="riskm-track" aria-hidden="true">
        <motion.i animate={{ width: risk.score + '%' }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
        <span className="riskm-tick" style={{ left: '35%' }} />
        <span className="riskm-tick" style={{ left: '60%' }} />
      </div>
      {!compact && (
        <ul className="riskm-factors">
          <AnimatePresence initial={false}>
            {risk.factors.map(f => (
              <motion.li key={f.key} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className={f.points < 0 ? 'down' : 'up'}>
                <span>{f.label}</span>
                <b>{f.points > 0 ? '+' + f.points : '−' + Math.abs(f.points)}</b>
              </motion.li>
            ))}
          </AnimatePresence>
          {risk.factors.length === 0 && <li className="none"><span>No risk signals</span><b>0</b></li>}
        </ul>
      )}
    </div>
  );
}
