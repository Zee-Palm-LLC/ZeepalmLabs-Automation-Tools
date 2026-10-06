import { motion, AnimatePresence } from 'motion/react';
import { ArrowsClockwise, Timer, CheckCircle, Hourglass, XCircle, Clock } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Avatar } from './ui.jsx';
import { whenLabel, providerOf, until, seconds, money, displayName } from '../lib/format.js';

const STATE = {
  yes: { label: 'Booked', icon: CheckCircle, tone: 'good' },
  late: { label: 'Too late', icon: XCircle, tone: 'quiet' },
  no: { label: 'Said no', icon: XCircle, tone: 'quiet' },
  wait: { label: 'Texted', icon: Hourglass, tone: 'wait' },
  sending: { label: 'Sending', icon: Clock, tone: 'quiet' },
  none: { label: 'No reply', icon: Clock, tone: 'quiet' }
};

export function candidateState(c, offer, now) {
  if (c.reply && Date.parse(c.replyAt) <= now) return c.reply;
  if (offer.status !== 'open') return 'none';
  return Date.parse(offer.sentAt) + 1500 > now ? 'sending' : 'wait';
}

export default function OfferBoard({ offer, compact = false }) {
  const { data, now } = useDesk();
  const S = data.settings;
  const filled = offer.status === 'filled' && Date.parse(offer.filledAt) <= now;
  const winner = filled ? offer.candidates.find(c => c.reply === 'yes') : null;
  const took = filled ? (Date.parse(offer.filledAt) - Date.parse(offer.sentAt)) / 1000 : 0;
  return (
    <div className={'offer' + (filled ? ' is-filled' : offer.status === 'expired' ? ' is-expired' : ' is-open') + (compact ? ' is-compact' : '')}>
      <div className="offer-head">
        <span className="offer-icon"><ArrowsClockwise size={16} weight="bold" /></span>
        <span className="offer-slot">
          <strong>{whenLabel(offer.start, now).replace(/^(today|tomorrow), /, (m, d) => d[0].toUpperCase() + d.slice(1) + ', ')}</strong>
          <em>{providerOf(S, offer.provider).short}, {offer.minutes} min, {offer.reason === 'moved' ? 'moved by the patient' : 'cancelled'}</em>
        </span>
        <AnimatePresence mode="wait" initial={false}>
          {filled ? (
            <motion.span key="f" className="offer-state good" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <CheckCircle size={14} weight="fill" /> Refilled in {seconds(took)}
            </motion.span>
          ) : offer.status === 'expired' ? (
            <motion.span key="e" className="offer-state quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>No taker</motion.span>
          ) : (
            <motion.span key="o" className="offer-state live" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Timer size={14} weight="bold" /> {until(offer.expiresAt, now)} left
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <ul className="offer-cands">
        {offer.candidates.map((c, i) => {
          const p = data.patients.find(x => x.id === c.patientId);
          const st = candidateState(c, offer, now);
          const meta = STATE[st];
          const Icon = meta.icon;
          return (
            <motion.li key={c.patientId + i} layout className={'cand cand-' + st} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Avatar patient={p} size={28} />
              <span className="cand-who">
                <strong>{p && p.demo ? displayName(p) + ' (you)' : displayName(p)}</strong>
                {!compact && <em>{c.reasons && c.reasons.length ? c.reasons.slice(0, 2).join(', ') : 'Match score ' + c.score}</em>}
              </span>
              <span className="cand-score" title="Match score">{c.score}</span>
              <span className={'cand-state t-' + meta.tone}><Icon size={13} weight="fill" /> {meta.label}</span>
            </motion.li>
          );
        })}
      </ul>
      {filled && winner && !compact && (
        <motion.p className="offer-foot" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          {money(offer.value)} visit kept on the books. Everyone else stays on the waitlist.
        </motion.p>
      )}
    </div>
  );
}
