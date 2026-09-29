import { motion } from 'motion/react';

const LEVELS = [
  { key: 'highRisk', label: 'High risk', color: 'var(--red)' },
  { key: 'mediumRisk', label: 'Medium', color: 'var(--yellow)' },
  { key: 'lowRisk', label: 'Steady', color: 'var(--green)' }
];

export default function Barbell({ stats }) {
  const total = LEVELS.reduce((a, l) => a + (stats[l.key] || 0), 0);
  const maxSide = 130;
  const widths = LEVELS.map(l => (total ? Math.max(stats[l.key] ? 8 : 0, (maxSide * (stats[l.key] || 0)) / total) : 0));
  const plateH = 150;
  const cy = 100;
  const leftCollar = 168;
  const rightCollar = 392;
  const plates = [];
  let lx = leftCollar;
  let rx = rightCollar;
  LEVELS.forEach((l, i) => {
    const w = widths[i];
    if (!w) return;
    lx -= w + 3;
    plates.push({ id: 'l' + i, x: lx, w, color: l.color, from: -60, delay: 0.15 + i * 0.12 });
    plates.push({ id: 'r' + i, x: rx + 3, w, color: l.color, from: 60, delay: 0.15 + i * 0.12 });
    rx += w + 3;
  });

  return (
    <div className="barbell">
      <svg viewBox="0 0 560 200" role="img" aria-label={LEVELS.map(l => (stats[l.key] || 0) + ' ' + l.label).join(', ')}>
        <rect x="14" y={cy - 7} width="532" height="14" rx="4" fill="var(--steel)" />
        <rect x="186" y={cy - 5} width="188" height="10" rx="2" fill="var(--steel-dark)" />
        {Array.from({ length: 22 }, (_, i) => (
          <line key={i} x1={192 + i * 8} x2={196 + i * 8} y1={cy - 5} y2={cy + 5} stroke="var(--steel)" strokeWidth="1.2" />
        ))}
        <rect x={leftCollar} y={cy - 14} width="10" height="28" rx="2" fill="var(--steel-dark)" />
        <rect x={rightCollar - 10} y={cy - 14} width="10" height="28" rx="2" fill="var(--steel-dark)" />
        {plates.map(p => (
          <motion.g
            key={p.id + p.w.toFixed(1)}
            style={{ filter: 'drop-shadow(0 0 9px ' + p.color + ')' }}
            initial={{ x: p.from, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 170, damping: 17, delay: p.delay }}
          >
            <rect x={p.x} y={cy - plateH / 2} width={p.w} height={plateH} rx="5" fill={p.color} />
            <rect x={p.x + 2} y={cy - plateH / 2 + 6} width={Math.max(1, p.w - 4)} height={plateH - 12} rx="3" fill="rgba(5,8,14,0.28)" />
            <rect x={p.x} y={cy - plateH / 2} width={p.w} height="3" rx="1.5" fill="rgba(255,255,255,0.55)" />
          </motion.g>
        ))}
        {!total && (
          <text x="280" y="170" textAnchor="middle" fontSize="14" fill="var(--ink-3)">Run a scan to load the bar</text>
        )}
      </svg>
      <ul className="barbell-legend">
        {LEVELS.map(l => (
          <li key={l.key}>
            <span className="swatch" style={{ background: l.color }} />
            <strong>{stats[l.key] || 0}</strong> {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
