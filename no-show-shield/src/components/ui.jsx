import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, animate } from 'motion/react';
import { CheckCircle, WarningCircle, Info, X, ArrowUpRight, ArrowDownRight } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { apptStatus } from '../lib/format.js';
import { hueFor, initialsOf } from '../lib/metrics.js';

export function Card({ title, sub, action, children, className = '', pad = true, ...rest }) {
  return (
    <section className={'card ' + className} {...rest}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      <div className={pad ? 'card-body' : 'card-body flush'}>{children}</div>
    </section>
  );
}

export function StatusPill({ appt, size }) {
  const s = apptStatus(appt);
  return (
    <span className={'pill pill-' + s.tone + (size === 'sm' ? ' pill-sm' : '')}>
      <i className="pill-dot" aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function Pill({ tone = 'quiet', size, children }) {
  return (
    <span className={'pill pill-' + tone + (size === 'sm' ? ' pill-sm' : '')}>
      <i className="pill-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function RiskBadge({ risk, size }) {
  return (
    <span className={'risk risk-' + risk.level + (size === 'sm' ? ' risk-sm' : '')} title={risk.factors.map(f => f.label).join(', ')}>
      <span className="risk-bar" aria-hidden="true"><i style={{ width: risk.score + '%' }} /></span>
      <b>{risk.score}</b>
    </span>
  );
}

export function Avatar({ patient, size = 36, label }) {
  const key = patient ? patient.phone : label;
  const hue = hueFor(key);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36), '--hue': hue }} aria-hidden="true">
      {label ? label : initialsOf(patient)}
    </span>
  );
}

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Delta({ value, invert = false, suffix = '', points = false }) {
  if (value == null || !isFinite(value)) return <span className="delta delta-flat">no change</span>;
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.005;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  const text = points ? Math.abs(Math.round(value * 100)) + ' pts' : Math.abs(Math.round(value * 100)) + '%';
  return (
    <span className={'delta ' + (flat ? 'delta-flat' : good ? 'delta-good' : 'delta-bad')}>
      {!flat && <Icon size={12} weight="bold" />}
      {flat ? 'no change' : text + suffix}
    </span>
  );
}

export function CountUp({ value, format = v => Math.round(v).toLocaleString('en-US'), duration = 1.1 }) {
  const [shown, setShown] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const c = animate(from, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [value, duration]);
  return <>{format(shown)}</>;
}

export function Segmented({ value, onChange, options, label, size }) {
  const id = useId();
  return (
    <div className={'seg' + (size === 'sm' ? ' seg-sm' : '')} role="tablist" aria-label={label}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => onChange(o.value)}>
            {on && <motion.span layoutId={'seg-' + id} className="seg-thumb" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="seg-label">
              {o.label}
              {o.count != null && <span className="seg-count">{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <span className="empty-icon"><Icon size={22} weight="duotone" /></span>}
      {title && <strong>{title}</strong>}
      {children && <p>{children}</p>}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r = 8, style }) {
  return <span className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />;
}

export function Switch({ checked, onChange, label, hint }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true"><motion.span className="switch-knob" layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} /></span>
      <span className="switch-text">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </span>
    </label>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useDesk();
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = t.tone === 'good' ? CheckCircle : t.tone === 'bad' ? WarningCircle : Info;
          return (
            <motion.div
              key={t.id}
              layout
              className={'toast toast-' + t.tone}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <Icon size={18} weight="fill" />
              <span>{t.message}</span>
              <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss"><X size={14} weight="bold" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function Tip({ children, tip }) {
  return (
    <span className="tip" data-tip={tip}>
      {children}
    </span>
  );
}
