import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, animate } from 'motion/react';
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { STATUS } from '../lib/format.js';

export function StatusPill({ status, urgent }) {
  const s = STATUS[status] || { label: status, tone: 'quiet' };
  return (
    <span className={'pill pill-' + s.tone + (urgent && status === 'booked' ? ' pill-stripe' : '')}>
      {urgent && status === 'booked' ? 'Emergency booked' : s.label}
    </span>
  );
}

export function CountUp({ value, format = v => Math.round(v).toLocaleString('en-US') }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return undefined;
    const c = animate(from, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [value]);
  return <>{format(shown)}</>;
}

export function Toasts() {
  const { toasts, dismissToast } = useDesk();
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = t.tone === 'good' ? CheckCircle : t.tone === 'bad' ? WarningCircle : Info;
          return (
            <motion.div key={t.id} className={'toast toast-' + t.tone} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
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

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
