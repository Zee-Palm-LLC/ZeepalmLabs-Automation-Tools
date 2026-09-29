import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, Sparkle } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { PUBLIC_DEMO } from '../lib/api.js';

export default function ScanBanner() {
  const { busy, scan, data } = useGym();
  const show = busy === 'scan' && scan;
  const writing = show && scan.phase === 'writing';
  const text = !show ? '' : writing
    ? 'Scored ' + data.stats.scoredMembers + ' members. ' + data.stats.highRisk + ' at high risk. ' + (scan.sent ? scan.sent + (PUBLIC_DEMO ? ' win-back emails written' : ' win-back emails sent') : 'Claude is writing their personal win-back emails')
    : scan.phase === 'retrying'
      ? 'Waiting for n8n to answer'
      : 'Scoring every member from their visit history';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={'scan-banner' + (writing ? ' is-writing' : '')}
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="scan-banner-inner">
            <span className="scan-icon">
              {writing ? <Sparkle size={18} weight="fill" /> : <Crosshair size={18} weight="bold" />}
              <span className="scan-ping" />
            </span>
            <motion.span key={text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{text}</motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
