import { useState } from 'react';
import { motion } from 'motion/react';
import { shortDate, time } from '../lib/format.js';

const W = 640;
const H = 220;
const PAD = { l: 40, r: 14, t: 16, b: 28 };

export function LineChart({ from, to, series, domain, limits = [], band, unit = '', label }) {
  const [hover, setHover] = useState(null);
  const [y0, y1] = domain;
  const x = t => PAD.l + ((t - from) / (to - from)) * (W - PAD.l - PAD.r);
  const y = v => PAD.t + (1 - (v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const ticks = [];
  const step = (y1 - y0) / 4;
  for (let i = 0; i <= 4; i++) ticks.push(Math.round(y0 + step * i));
  const days = [];
  const span = to - from;
  const every = span > 20 * 86400000 ? 7 : span > 10 * 86400000 ? 3 : 1;
  for (let t = from, i = 0; t <= to; t += 86400000, i++) if (i % every === 0) days.push(t);
  const all = series.flatMap(s => s.points.map(p => ({ ...p, s })));
  const near = mx => {
    let best = null;
    for (const p of all) {
      const d = Math.abs(x(p.t) - mx);
      if (!best || d < best.d) best = { d, p };
    }
    return best && best.d < 24 ? best.p : null;
  };
  return (
    <div className="chart" aria-label={label}>
      <svg
        viewBox={'0 0 ' + W + ' ' + H}
        role="img"
        aria-label={label}
        onPointerMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(near(((e.clientX - r.left) / r.width) * W));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {band && <rect x={PAD.l} width={W - PAD.l - PAD.r} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} className="chart-band" />}
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD.l - 8} y={y(v) + 4} className="chart-y">{v}</text>
          </g>
        ))}
        {days.map(t => <text key={t} x={x(t)} y={H - 8} className="chart-x">{shortDate(t + 43200000)}</text>)}
        {limits.map(l => (
          <g key={l.label}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(l.value)} y2={y(l.value)} className={'chart-limit ' + (l.tone || '')} />
            <text x={W - PAD.r} y={y(l.value) - 5} className={'chart-limit-label ' + (l.tone || '')}>{l.label}</text>
          </g>
        ))}
        {series.map(s => {
          if (!s.points.length) return null;
          const d = s.points.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
          return (
            <g key={s.key} className={'chart-series ' + s.className}>
              <motion.path d={d} className="chart-line" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
              {s.points.map(p => (
                <circle key={p.id || p.t} cx={x(p.t)} cy={y(p.v)} r={p.flag ? 5 : 2.6} className={'chart-dot' + (p.flag ? ' is-flag' : '')} />
              ))}
            </g>
          );
        })}
        {hover && <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.t} y2={H - PAD.b} className="chart-hover" />}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: (x(hover.t) / W) * 100 + '%' }}>
          <b>{hover.label || hover.v + unit}</b>
          <span>{shortDate(hover.t)}, {time(hover.t)}</span>
          {hover.note && <em>{hover.note}</em>}
        </div>
      )}
    </div>
  );
}

export function Bars({ items, max = 1, format = v => Math.round(v * 100) + '%' }) {
  return (
    <ul className="bars">
      {items.map(it => (
        <li key={it.key}>
          <span className="bars-label">{it.icon}{it.label}</span>
          <span className="bars-track"><motion.i className={'tone-' + (it.tone || 'brand')} initial={{ width: 0 }} animate={{ width: Math.max(2, (it.value / max) * 100) + '%' }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} /></span>
          <b>{format(it.value)}</b>
          {it.sub && <em>{it.sub}</em>}
        </li>
      ))}
    </ul>
  );
}
