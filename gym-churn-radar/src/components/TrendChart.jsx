import { useState } from 'react';
import { motion } from 'motion/react';
import { shortDate } from '../lib/format.js';

export default function TrendChart({ trend, height = 180 }) {
  const [hover, setHover] = useState(null);
  if (!trend || !trend.length) return null;
  const max = Math.max(4, ...trend.map(p => p.count));
  const w = 900;
  const pad = 26;
  const bw = w / trend.length;
  const avg = trend.reduce((a, p) => a + p.count, 0) / trend.length;
  const avgY = height - pad - ((height - pad - 10) * avg) / max;
  const active = hover == null ? null : trend[hover];

  return (
    <div className="trend-chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={'0 0 ' + w + ' ' + height} preserveAspectRatio="none" role="img" aria-label="Check-ins per day over the last 30 days">
        <defs>
          <linearGradient id="trend-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="trend-hot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--red)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--red)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {trend.map((p, i) => {
          const bh = Math.max(3, ((height - pad - 10) * p.count) / max);
          const last = i === trend.length - 1;
          return (
            <g key={p.date} onMouseEnter={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={height - pad} fill="transparent" />
              <motion.rect
                x={i * bw + bw * 0.2}
                width={bw * 0.6}
                rx="3"
                initial={{ y: height - pad, height: 0 }}
                animate={{ y: height - pad - bh, height: bh }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.018 }}
                fill={hover === i ? 'var(--ink)' : last ? 'url(#trend-hot)' : 'url(#trend-bar)'}
                className="trend-bar"
              />
            </g>
          );
        })}
        <line x1="0" x2={w} y1={avgY} y2={avgY} stroke="var(--ink-3)" strokeDasharray="4 6" strokeWidth="1.2" />
        <text x="0" y={height - 6} fontSize="13" fill="var(--ink-3)">{shortDate(trend[0].date)}</text>
        <text x={w} y={height - 6} fontSize="13" fill="var(--ink-3)" textAnchor="end">Today</text>
      </svg>
      <div className="trend-readout" aria-live="polite">
        {active
          ? <><strong>{active.count}</strong> check-ins on {shortDate(active.date)}</>
          : <><strong>{avg.toFixed(1)}</strong> check-ins a day on average</>}
      </div>
    </div>
  );
}
