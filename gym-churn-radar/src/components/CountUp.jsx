import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

const plain = v => Math.round(v).toLocaleString('en-US');

export default function CountUp({ value, format = plain, duration = 1.4, className }) {
  const ref = useRef(null);
  const from = useRef(0);
  const formatRef = useRef(format);
  formatRef.current = format;
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const target = Number(value || 0);
    if (reduce) {
      node.textContent = formatRef.current(target);
      from.current = target;
      return;
    }
    const controls = animate(from.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => { node.textContent = formatRef.current(v); }
    });
    from.current = target;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span ref={ref} className={className}>{formatRef.current(0)}</span>;
}
