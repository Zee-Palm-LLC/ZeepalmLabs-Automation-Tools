import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ShieldCheck, Sparkle, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import Phone from './Phone.jsx';
import Timeline from './Timeline.jsx';
import JobTicket from './JobTicket.jsx';
import { phone } from '../lib/format.js';

export function LiveStage({ inOverlay = false }) {
  const { data, sim, typing, demo, endSim } = useDesk();
  const lead = sim.leadId ? data.leads.find(l => l.id === sim.leadId) : null;
  const s = data.settings;
  return (
    <div className={'stage' + (inOverlay ? ' in-overlay' : '')}>
      <div className="stage-glow" aria-hidden="true" />
      <div className="stage-grid">
        <div className="stage-col stage-left">
          <div className="stage-intro">
            <span className="eyebrow-chip"><Sparkle size={13} weight="fill" /> {sim.phase === 'dial' ? 'Try it yourself' : 'Rescue in progress'}</span>
            <h2>Every missed call gets a text back in seconds.</h2>
            <p>Call {s.shortName}'s line and let it ring out. The AI texts you back, works out the job and books it, the same way it would for a real customer.</p>
          </div>
          <Timeline />
        </div>
        <div className="stage-phone">
          <Phone />
          {sim.phase !== 'dial' && (
            <button type="button" className="btn btn-ghost btn-sm stage-restart" onClick={endSim}><ArrowCounterClockwise size={14} weight="bold" /> Start over</button>
          )}
        </div>
        <div className="stage-col stage-right">
          <span className="stage-label">What the AI understood</span>
          <JobTicket lead={lead} hold={lead ? typing(lead.id) : false} empty="Filled in live from the customer's texts." />
          <div className="stage-note">
            <ShieldCheck size={18} weight="duotone" />
            <p>
              {!s.aiEnabled
                ? 'AI replies are paused, so texts go to the owner. Turn them back on in the sidebar.'
                : demo
                  ? 'Nothing is sent. This demo runs in your browser with a scripted stand-in for Claude, so it costs nothing to run.'
                  : 'Replies come from Claude through your n8n workspace. Demo mode keeps real texts from being sent.'}
            </p>
          </div>
          <div className="stage-line">
            <span>Demo line</span>
            <strong>{phone(s.businessPhone)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StageOverlay() {
  const { stageOpen, setStageOpen } = useUi();
  const { data } = useDesk();

  useEffect(() => {
    if (!stageOpen) return undefined;
    const onKey = e => e.key === 'Escape' && setStageOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [stageOpen, setStageOpen]);

  return (
    <AnimatePresence>
      {stageOpen && data && (
        <motion.div className="overlay stage-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div
            className="stage-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Live demo"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <button type="button" className="icon-btn stage-close" onClick={() => setStageOpen(false)} aria-label="Close the live demo"><X size={20} /></button>
            <LiveStage inOverlay />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
