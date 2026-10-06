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

export function DailyChart({ series, mode, baseline }) {
  const [ref, { w }] = useSize();
  const [hover, setHover] = useState(null);
  const id = useId().replace(/:/g, '');
  const H = 250;
  const padL = 36;
  const padB = 26;
  const padT = 12;
  const n = series.dates.length;
  const innerW = Math.max(0, w - padL - 6);
  const innerH = H - padB - padT;
  const step = innerW / n;
  const totals = series.kept.map((k, i) => k + series.refilled[i] + series.noShow[i]);
  const rate = series.rate.map((_, i) => {
    let a = 0;
    let b = 0;
    for (let k = Math.max(0, i - 2); k <= i; k++) {
      a += series.noShow[k];
      b += totals[k];
    }
    return b ? a / b : 0;
  });
  const niceMax = useMemo(() => {
    if (mode === 'rate') return Math.max(0.2, Math.ceil(Math.max(baseline, ...rate) * 20) / 20);
    const raw = Math.max(4, ...totals) / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const s = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= raw) || raw;
    return Math.ceil(s) * 4;
  }, [mode, totals.join(','), rate.join(','), baseline]);
  const y = v => padT + innerH - (v / niceMax) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * niceMax);
  const fmt = v => (mode === 'rate' ? Math.round(v * 100) + '%' : Math.round(v));
  const label = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const pts = rate.map((v, i) => [padL + step * i + step / 2, y(v)]);
  const line = smooth(pts);

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left - padL;
    setHover(Math.max(0, Math.min(n - 1, Math.floor(x / step))));
  };

  return (
    <div ref={ref} className="chart" style={{ height: H }}>
      {w > 0 && (
        <svg width={w} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={mode === 'rate' ? 'No-show rate per day' : 'Visits kept, refilled and missed per day'}>
          <defs>
            <linearGradient id={'ar' + id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--brand)" stopOpacity="0.3" />
              <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(t => (
            <g key={t}>
              <line x1={padL} x2={w - 6} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={padL - 8} y={y(t) + 4} className="axis-label" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          {series.dates.map((t, i) => ((i % 5 === 0 && n - 1 - i >= 3) || i === n - 1) && (
            <text key={t} x={padL + step * i + step / 2} y={H - 6} className="axis-label" textAnchor="middle">{i === n - 1 ? 'Today' : label(t)}</text>
          ))}
          {hover != null && <rect x={padL + step * hover} y={padT} width={step} height={innerH} className="hover-band" />}
          <AnimatePresence mode="wait">
            {mode === 'visits' ? (
              <motion.g key="visits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {series.kept.map((k, i) => {
                  const bw = Math.max(3, Math.min(18, step * 0.58));
                  const x = padL + step * i + (step - bw) / 2;
                  const base = padT + innerH;
                  const hk = (k / niceMax) * innerH;
                  const hr = (series.refilled[i] / niceMax) * innerH;
                  const hn = (series.noShow[i] / niceMax) * innerH;
                  const seg = (cls, top, h, delay) => (
                    <motion.rect x={x} width={bw} rx={Math.min(3, bw / 2)} className={cls} initial={{ y: base, height: 0 }} animate={{ y: top, height: Math.max(0, h - (h > 2 ? 1.5 : 0)) }} transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }} />
                  );
                  return (
                    <g key={i}>
                      {seg('bar-kept', base - hk, hk, i * 0.012)}
                      {seg('bar-refill', base - hk - hr, hr, 0.1 + i * 0.012)}
                      {seg('bar-noshow', base - hk - hr - hn, hn, 0.2 + i * 0.012)}
                    </g>
                  );
                })}
              </motion.g>
            ) : (
              <motion.g key="rate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <line x1={padL} x2={w - 6} y1={y(baseline)} y2={y(baseline)} className="baseline-line" />
                <text x={w - 10} y={y(baseline) - 7} className="baseline-label" textAnchor="end">Before No-Show Shield, {Math.round(baseline * 100)}%</text>
                <path d={line + ' L' + pts[n - 1][0] + ',' + (padT + innerH) + ' L' + pts[0][0] + ',' + (padT + innerH) + ' Z'} fill={'url(#ar' + id + ')'} />
                <motion.path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
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
            animate={{ opacity: 1, y: 0, left: Math.min(w - 180, Math.max(0, padL + step * hover + step / 2 - 85)) }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <strong>{new Date(series.dates[hover]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
            <span><i className="sw sw-kept" />Kept <b>{series.kept[hover]}</b></span>
            <span><i className="sw sw-refill" />Refilled <b>{series.refilled[hover]}</b></span>
            <span><i className="sw sw-noshow" />No-shows <b>{series.noShow[hover]}</b></span>
            <span><i className="sw sw-rate" />3-day no-show rate <b>{Math.round(rate[hover] * 1000) / 10}%</b></span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Lanes({ appts, providers, day, now, open, close, lunch, render, onPick, selected }) {
  const span = (close - open) * 60;
  const startOf = a => {
    const d = new Date(a.start);
    return (d.getHours() - open) * 60 + d.getMinutes();
  };
  const nowMin = (() => {
    const d = new Date(now);
    if (new Date(day).toDateString() !== d.toDateString()) return null;
    const m = (d.getHours() - open) * 60 + d.getMinutes();
    return m >= 0 && m <= span ? m : null;
  })();
  const hours = [];
  for (let h = open; h <= close; h++) hours.push(h);
  return (
    <div className="lanes">
      <div className="lanes-hours" aria-hidden="true">
        <span />
        <div>
          {hours.map(h => (
            <i key={h} style={{ left: ((h - open) * 60 / span) * 100 + '%' }}>{h === 12 ? '12 PM' : h > 12 ? h - 12 + (h === close ? ' PM' : '') : h + (h === open ? ' AM' : '')}</i>
          ))}
        </div>
      </div>
      {providers.map((p, r) => (
        <div key={p.key} className="lane">
          <span className="lane-who"><b>{p.short}</b><em>{p.role === 'hygienist' ? 'Hygiene' : 'Dentist'}</em></span>
          <div className="lane-track">
            <span className="lane-lunch" style={{ left: ((lunch - open) * 60 / span) * 100 + '%', width: (60 / span) * 100 + '%' }} />
            {appts.filter(a => a.provider === p.key).map((a, i) => (
              <motion.button
                key={a.id}
                type="button"
                className={'block ' + render(a).cls + (selected === a.id ? ' is-on' : '')}
                style={{ left: (startOf(a) / span) * 100 + '%', width: 'calc(' + (a.minutes / span) * 100 + '% - 3px)' }}
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: r * 0.08 + i * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onPick && onPick(a)}
                title={render(a).title}
              >
                {render(a).label}
              </motion.button>
            ))}
            {nowMin != null && <span className="lane-now" style={{ left: (nowMin / span) * 100 + '%' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}


const DONUT = ['var(--green)', 'var(--blue)', 'var(--amber)', 'var(--violet)', 'var(--red)', 'var(--cyan)', 'var(--pink)', 'var(--text-3)'];

export function Donut({ items, format = v => Math.round(v), totalLabel = 'Total', size = 168 }) {
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
          <strong>{format(shown ? shown.value : total)}</strong>
          <span>{shown ? shown.name : totalLabel}</span>
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
