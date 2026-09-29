import { motion } from 'motion/react';

export default function Segmented({ options, value, onChange, id, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={on} className={'seg' + (on ? ' is-on' : '')} onClick={() => onChange(o.value)}>
            {on && <motion.span layoutId={'seg-' + id} className="seg-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
            <span className="seg-label">{o.label}{o.count != null && <span className="seg-count">{o.count}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}
