import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, ArrowCounterClockwise, CircleNotch } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { ago } from '../lib/format.js';
import { PUBLIC_DEMO } from '../lib/api.js';

export default function TopBar({ title, subtitle }) {
  const { data, busy, scan, runScan, resetDemo } = useGym();
  const [confirm, setConfirm] = useState(false);
  const demo = data && data.gym.demoMode;

  return (
    <header className="topbar">
      <div className="topbar-title">
        <motion.h1 key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>{title}</motion.h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-meta">
        {demo && <span className="demo-chip">{PUBLIC_DEMO ? 'Live demo, nothing is sent' : 'Demo mode: emails go to the owner'}</span>}
        {data && <span className="muted small">{data.lastScanAt ? 'Last scan ' + ago(data.lastScanAt) : 'Not scanned yet'}</span>}
      </div>
      <div className="topbar-actions">
        {demo && (
          <AnimatePresence mode="wait" initial={false}>
            {confirm ? (
              <motion.div key="confirm" className="confirm-inline" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}>
                <span>Replace all data with a fresh demo gym?</span>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirm(false)}>Keep</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => { setConfirm(false); resetDemo(); }}>Reset</button>
              </motion.div>
            ) : (
              <motion.button key="reset" type="button" className="btn btn-quiet" disabled={!!busy} onClick={() => setConfirm(true)} whileTap={{ scale: 0.96 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {busy === 'reset' ? <CircleNotch size={18} weight="bold" className="spin" /> : <ArrowCounterClockwise size={18} weight="bold" />}
                {busy === 'reset' ? 'Resetting' : 'Reset demo'}
              </motion.button>
            )}
          </AnimatePresence>
        )}
        <motion.button type="button" className={'btn btn-primary btn-scan' + (busy === 'scan' ? ' is-scanning' : '') + (PUBLIC_DEMO && data && !data.lastScanAt && !busy ? ' is-hint' : '')} disabled={!!busy || !data} onClick={runScan} whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}>
          {busy === 'scan' ? <CircleNotch size={18} weight="bold" className="spin" /> : <Play size={18} weight="fill" />}
          {busy === 'scan' ? (scan && scan.phase === 'writing' ? 'Writing emails' : 'Scanning') : 'Run scan now'}
        </motion.button>
      </div>
      <AnimatePresence>
        {busy === 'scan' && scan && (
          <motion.div className="scan-strip" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <span className="scan-strip-glow" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
