import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

const smooth = pts => {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ' C' + cx + ',' + y0 + ' ' + cx + ',' + y1 + ' ' + x1 + ',' + y1;
  }
  return d;
};

export function Sparkline({ data: raw, color = 'var(--blue)', height = 38 }) {
  const [ref, { w }] = useSize();
  const data = raw.map((_, i) => {
    const win = raw.slice(Math.max(0, i - 2), i + 1);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });
  const id = useId().replace(/:/g, '');
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, height - 3 - (v / max) * (height - 8)]);
  const line = smooth(pts);
  return (
    <div ref={ref} className="spark" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} aria-hidden="true">
          <defs>
            <linearGradient id={'sg' + id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.32" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path d={line + ' L' + w + ',' + height + ' L0,' + height + ' Z'} fill={'url(#sg' + id + ')'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
        </svg>
      )}
    </div>
  );
}

export function DailyChart({ series, mode, currency = '$' }) {
  const [ref, { w }] = useSize();
  const [hover, setHover] = useState(null);
  const id = useId().replace(/:/g, '');
  const H = 250;
  const padL = 34;
  const padB = 26;
  const padT = 12;
  const n = series.dates.length;
  const innerW = Math.max(0, w - padL - 6);
  const innerH = H - padB - padT;
  const step = innerW / n;
  const values = mode === 'revenue' ? series.revenue : series.missed;
  const rawMax = Math.max(1, ...values);
  const niceMax = useMemo(() => {
    const raw = rawMax / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const steps = mode === 'revenue' ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
    const step = Math.max(mode === 'revenue' ? 1 : 1, steps.map(k => k * p).find(k => k >= raw) || raw);
    return (mode === 'revenue' ? step : Math.ceil(step)) * 4;
  }, [rawMax, mode]);
  const y = v => padT + innerH - (v / niceMax) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * niceMax);
  const fmt = v => (mode === 'revenue' ? (v >= 1000 ? currency + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : currency + Math.round(v)) : Math.round(v));
  const label = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const pts = series.revenue.map((v, i) => [padL + step * i + step / 2, y(v)]);
  const line = smooth(pts);

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left - padL;
    const i = Math.max(0, Math.min(n - 1, Math.floor(x / step)));
    setHover(i);
  };

  return (
    <div ref={ref} className="chart" style={{ height: H }}>
      {w > 0 && (
        <svg width={w} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={mode === 'revenue' ? 'Revenue won back per day' : 'Missed calls and jobs booked per day'}>
          <defs>
            <linearGradient id={'ar' + id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--green)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(t => (
            <g key={t}>
              <line x1={padL} x2={w - 6} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={padL - 8} y={y(t) + 4} className="axis-label" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          {series.dates.map((t, i) => (i % 5 === 0 || i === n - 1) && (
            <text key={t} x={padL + step * i + step / 2} y={H - 6} className="axis-label" textAnchor="middle">{i === n - 1 ? 'Today' : label(t)}</text>
          ))}
          {hover != null && <rect x={padL + step * hover} y={padT} width={step} height={innerH} className="hover-band" />}
          <AnimatePresence mode="wait">
            {mode === 'calls' ? (
              <motion.g key="calls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {series.missed.map((m, i) => {
                  const b = Math.min(series.booked[i], m);
                  const bw = Math.max(2, Math.min(14, step * 0.56));
                  const x = padL + step * i + (step - bw) / 2;
                  const hTotal = (m / niceMax) * innerH;
                  const hBooked = (b / niceMax) * innerH;
                  return (
                    <g key={i}>
                      <motion.rect x={x} width={bw} rx={Math.min(4, bw / 2)} className="bar-missed" initial={{ y: padT + innerH, height: 0 }} animate={{ y: padT + innerH - hTotal, height: hTotal }} transition={{ duration: 0.7, delay: i * 0.012, ease: [0.16, 1, 0.3, 1] }} />
                      <motion.rect x={x} width={bw} rx={Math.min(4, bw / 2)} className="bar-booked" initial={{ y: padT + innerH, height: 0 }} animate={{ y: padT + innerH - hBooked, height: hBooked }} transition={{ duration: 0.7, delay: 0.15 + i * 0.012, ease: [0.16, 1, 0.3, 1] }} />
                    </g>
                  );
                })}
              </motion.g>
            ) : (
              <motion.g key="revenue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <path d={line + ' L' + pts[n - 1][0] + ',' + (padT + innerH) + ' L' + pts[0][0] + ',' + (padT + innerH) + ' Z'} fill={'url(#ar' + id + ')'} />
                <motion.path d={line} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
                {hover != null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" className="dot-hover" />}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      )}
      <AnimatePresence>
        {hover != null && w > 0 && (
          <motion.div
            className="chart-tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, left: Math.min(w - 170, Math.max(0, padL + step * hover + step / 2 - 80)) }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <strong>{new Date(series.dates[hover]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
            <span><i className="sw sw-missed" />Missed calls <b>{series.missed[hover]}</b></span>
            <span><i className="sw sw-booked" />Booked <b>{series.booked[hover]}</b></span>
            <span><i className="sw sw-rev" />Won back <b>{currency + series.revenue[hover].toLocaleString('en-US')}</b></span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DONUT = ['var(--green)', 'var(--blue)', 'var(--violet)', 'var(--amber)', 'var(--cyan)', 'var(--pink)', 'var(--text-3)'];

export function Donut({ items, currency = '$', size = 168 }) {
  const [active, setActive] = useState(null);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const shown = active != null ? items[active] : null;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} className="donut-track" />
          {items.map((it, i) => {
            const frac = it.value / total;
            const dash = Math.max(0, frac * c - 3);
            const off = -acc * c;
            acc += frac;
            return (
              <motion.circle
                key={it.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={DONUT[i % DONUT.length]}
                strokeWidth={active === i ? 18 : 14}
                strokeLinecap="round"
                strokeDasharray={dash + ' ' + c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: off }}
                transition={{ duration: 1, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', cursor: 'pointer' }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <strong>{currency}{Math.round((shown ? shown.value : total) / 100) / 10}k</strong>
          <span>{shown ? shown.name : 'Total booked'}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {items.slice(0, 6).map((it, i) => (
          <li key={it.key} className={active === i ? 'on' : ''} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <i style={{ background: DONUT[i % DONUT.length] }} />
            <span>{it.name}</span>
            <b>{Math.round((it.value / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Funnel({ steps }) {
  const top = Math.max(1, steps[0].value);
  return (
    <ol className="funnel">
      {steps.map((s, i) => {
        const pct = s.value / top;
        const conv = i > 0 && steps[i - 1].value ? s.value / steps[i - 1].value : null;
        return (
          <li key={s.label}>
            <div className="funnel-row">
              <span className="funnel-label">{s.label}</span>
              <span className="funnel-value">{s.value}</span>
            </div>
            <div className="funnel-track">
              <motion.div className={'funnel-bar fb-' + i} initial={{ width: 0 }} animate={{ width: pct * 100 + '%' }} transition={{ duration: 0.9, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            {conv != null && <span className="funnel-conv">{Math.round(conv * 100)}% of the step before</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function Ring({ value, size = 120, stroke = 10, color = 'var(--green)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export function Heatmap({ heat, hourLabel }) {
  const [tip, setTip] = useState(null);
  const peak = Math.max(1, ...heat.flat());
  return (
    <div className="heat" role="table" aria-label="Missed calls by day and hour" onMouseLeave={() => setTip(null)}>
      <div className="heat-row heat-hours" role="row">
        <span role="columnheader" />
        {HOURS.map(h => <span key={h} role="columnheader">{h % 3 === 0 ? hourLabel(h) : ''}</span>)}
      </div>
      {DAYS.map((d, r) => (
        <div key={d} className="heat-row" role="row">
          <span role="rowheader">{NAMES[d]}</span>
          {HOURS.map((h, c) => {
            const v = heat[d][h];
            return (
              <motion.span
                key={h}
                role="cell"
                className={'heat-cell' + (tip && tip.d === d && tip.h === h ? ' on' : '')}
                style={{ '--a': v ? 0.16 + (v / peak) * 0.84 : 0 }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (r + c) * 0.012, duration: 0.3 }}
                onMouseEnter={() => setTip({ d, h, v })}
                aria-label={NAMES[d] + ' ' + hourLabel(h) + ', ' + v + ' missed'}
              />
            );
          })}
        </div>
      ))}
      <div className="heat-foot">
        <span className="heat-tip">{tip ? NAMES[tip.d] + ' ' + hourLabel(tip.h) + ': ' + tip.v + ' missed ' + (tip.v === 1 ? 'call' : 'calls') : 'Hover a square to see the count'}</span>
        <span className="heat-scale"><span>Fewer</span><i style={{ '--a': 0.16 }} /><i style={{ '--a': 0.45 }} /><i style={{ '--a': 0.72 }} /><i style={{ '--a': 1 }} /><span>More</span></span>
      </div>
    </div>
  );
}

export function useInView(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}
