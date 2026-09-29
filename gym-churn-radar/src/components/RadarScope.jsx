import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGym } from '../state/GymProvider.jsx';

const SIZE = 420;
const C = SIZE / 2;
const R = 190;
const PERIOD = 4.8;
const GLIDE = { type: 'spring', stiffness: 70, damping: 16 };

const hash = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};

export default function RadarScope({ scanning = false }) {
  const { data, openMember } = useGym();
  const [hover, setHover] = useState(null);
  const reduce = useReducedMotion();
  const period = scanning ? PERIOD / 2.4 : PERIOD;

  const blips = useMemo(() => data.members
    .filter(m => m.status === 'active')
    .map(m => {
      const angle = hash(m.ref) * 360;
      const dist = m.score == null ? 0.94 : 0.14 + 0.8 * (1 - m.score / 100);
      const rad = (angle - 90) * (Math.PI / 180);
      return { m, angle, x: C + Math.cos(rad) * R * dist, y: C + Math.sin(rad) * R * dist };
    }), [data.members]);

  const active = hover ? blips.find(b => b.m.ref === hover) : null;

  return (
    <div className={'scope' + (scanning ? ' is-scanning' : '')}>
      <div className="scope-disc">
        <motion.div
          className="scope-sweep"
          aria-hidden="true"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: period, repeat: Infinity, ease: 'linear' }}
        />
        <svg viewBox={'0 0 ' + SIZE + ' ' + SIZE} role="img" aria-label="Radar of members by churn risk. Closer to the center means higher risk.">
          <defs>
            <radialGradient id="scope-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--red)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r={R * 0.34} fill="url(#scope-core)" />
          {[0.34, 0.6, 0.86, 1].map(f => (
            <circle key={f} cx={C} cy={C} r={R * f} className={'scope-ring' + (f === 1 ? ' outer' : '')} />
          ))}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 - 90) * (Math.PI / 180);
            return <line key={i} x1={C + Math.cos(a) * R * 0.34} y1={C + Math.sin(a) * R * 0.34} x2={C + Math.cos(a) * R} y2={C + Math.sin(a) * R} className="scope-spoke" />;
          })}
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i * 5 - 90) * (Math.PI / 180);
            const long = i % 6 === 0;
            return <line key={'t' + i} x1={C + Math.cos(a) * (R + 4)} y1={C + Math.sin(a) * (R + 4)} x2={C + Math.cos(a) * (R + (long ? 12 : 7))} y2={C + Math.sin(a) * (R + (long ? 12 : 7))} className="scope-tick" />;
          })}
          <text x={C} y={C - R * 0.34 + 16} className="scope-label" textAnchor="middle">DANGER</text>
          <text x={C} y={C - R * 0.86 + 16} className="scope-label" textAnchor="middle">STEADY</text>
          {blips.map(b => (
            <g key={b.m.ref} className="blip" data-level={b.m.level} onMouseEnter={() => setHover(b.m.ref)} onMouseLeave={() => setHover(null)} onClick={() => openMember(b.m.ref)} onFocus={() => setHover(b.m.ref)} onBlur={() => setHover(null)} tabIndex={0} role="button" aria-label={b.m.name + (b.m.score == null ? ', not scored' : ', risk ' + b.m.score)} onKeyDown={e => { if (e.key === 'Enter') openMember(b.m.ref); }}>
              <motion.circle initial={false} animate={{ cx: b.x, cy: b.y }} transition={GLIDE} r="14" fill="transparent" />
              {!reduce && (
                <motion.circle
                  className="blip-ping"
                  initial={{ r: 4, opacity: 0, cx: b.x, cy: b.y }}
                  animate={{ r: [4, 16], opacity: [0.7, 0], cx: b.x, cy: b.y }}
                  transition={{ duration: period, times: [0, 0.22], repeat: Infinity, delay: (b.angle / 360) * period, ease: 'easeOut', cx: GLIDE, cy: GLIDE }}
                />
              )}
              <motion.circle
                className="blip-dot"
                initial={{ r: 0, cx: b.x, cy: b.y }}
                animate={reduce ? { r: b.m.level === 'high' ? 5.5 : 4, cx: b.x, cy: b.y } : { r: b.m.level === 'high' ? 5.5 : 4, opacity: [1, 0.45], cx: b.x, cy: b.y }}
                transition={reduce ? { duration: 0 } : { r: { type: 'spring', stiffness: 300, damping: 14, delay: 0.3 + (b.angle / 360) * 0.8 }, opacity: { duration: period, repeat: Infinity, delay: (b.angle / 360) * period, ease: 'easeOut' }, cx: { ...GLIDE, delay: (b.angle / 360) * 0.6 }, cy: { ...GLIDE, delay: (b.angle / 360) * 0.6 } }}
              />
            </g>
          ))}
          <circle cx={C} cy={C} r="4" className="scope-center" />
        </svg>
        {active && (
          <div className="scope-tip" style={{ left: (active.x / SIZE) * 100 + '%', top: (active.y / SIZE) * 100 + '%' }}>
            <strong>{active.m.name}</strong>
            <span>{active.m.score == null ? 'Not scored' : 'Risk ' + active.m.score}</span>
          </div>
        )}
      </div>
    </div>
  );
}
