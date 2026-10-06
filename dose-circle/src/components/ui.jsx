import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, animate } from 'motion/react';
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { initials } from '../lib/format.js';

export function Card({ title, sub, action, children, className = '', flush = false, ...rest }) {
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
      <div className={flush ? 'card-body flush' : 'card-body'}>{children}</div>
    </section>
  );
}

export function Tag({ tone = 'quiet', size, children, icon: Icon }) {
  return (
    <span className={'tag tag-' + tone + (size === 'sm' ? ' tag-sm' : '')}>
      {Icon ? <Icon size={size === 'sm' ? 12 : 14} weight="bold" /> : <i className="tag-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Avatar({ who, size = 36, ring }) {
  const hue = who && who.hue != null ? who.hue : 240;
  return (
    <span className={'avatar' + (ring ? ' avatar-ring' : '')} style={{ width: size, height: size, fontSize: Math.round(size * 0.38), '--hue': hue }} aria-hidden="true">
      {initials(who ? who.name : '?')}
    </span>
  );
}

export function Ring({ value = 0, size = 64, stroke = 7, tone = 'brand', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <span className={'ring ring-' + tone} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fill"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'}
        />
      </svg>
      <span className="ring-label">{children}</span>
    </span>
  );
}

export function CountUp({ value, format = v => Math.round(v).toLocaleString('en-US'), duration = 1 }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return undefined;
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
              {o.icon}
              {o.label}
              {o.count != null && o.count > 0 && <span className="seg-count">{o.count}</span>}
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

export function Skeleton({ h = 16, w = '100%', r = 10, style }) {
  return <span className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />;
}

export function Switch({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={'switch' + (disabled ? ' is-disabled' : '')}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
      <span className="switch-text">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </span>
    </label>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useCare();
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

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className={'modal' + (wide ? ' modal-wide' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <header className="modal-head">
              <h2>{title}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} weight="bold" /></button>
            </header>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
