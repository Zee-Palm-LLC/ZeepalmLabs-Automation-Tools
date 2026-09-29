import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Warning, Info, X } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';

const ICONS = { success: CheckCircle, error: Warning, neutral: Info };

export default function Toasts() {
  const { toasts, dismissToast } = useGym();
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const Icon = ICONS[t.tone] || Info;
          return (
            <motion.div
              key={t.id}
              layout
              className={'toast toast-' + t.tone}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <Icon size={20} weight="fill" />
              <span>{t.message}</span>
              <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss"><X size={14} weight="bold" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
