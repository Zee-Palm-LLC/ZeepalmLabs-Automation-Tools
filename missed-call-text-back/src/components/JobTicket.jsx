import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { StatusPill } from './ui.jsx';
import { phone, slotLabel, money, serviceOf } from '../lib/format.js';

const URGENCY = { emergency: 'Emergency', soon: 'Soon', routine: 'Routine' };

export default function JobTicket({ lead, hold = false, compact = false, empty }) {
  const { data, now } = useDesk();
  const kept = useRef(lead);
  if (!hold || !kept.current || !lead || kept.current.id !== lead.id) kept.current = lead;
  const l = kept.current;
  const s = data.settings;

  if (!l) {
    return (
      <div className={'ticket is-empty' + (compact ? ' compact' : '')}>
        <div className="ticket-head"><span>Job ticket</span></div>
        <div className="ticket-rows">
          {['Customer', 'Problem', 'Urgency', 'Area', 'Time', 'Job value'].map(k => (
            <div key={k} className="ticket-row"><span>{k}</span><strong className="ticket-blank" /></div>
          ))}
        </div>
        <p className="ticket-note">{empty || 'The AI fills this in from the texts.'}</p>
      </div>
    );
  }

  const svc = l.service ? serviceOf(s, l.service) : null;
  const rows = [
    ['Customer', l.name || phone(l.phone)],
    ['Problem', l.issue],
    ['Urgency', l.urgency ? URGENCY[l.urgency] : null, l.urgency === 'emergency' ? 'hot' : ''],
    ['Area', l.address || l.zip],
    ['Time', l.slot && l.status === 'booked' ? (l.urgent ? 'On the way, ' : '') + slotLabel(l.slot, now) : l.offered && l.offered.length && l.status !== 'lost' ? 'Choosing from ' + l.offered.length + ' slots' : null],
    ['Job value', l.status === 'booked' ? money(l.value, s.currency) : svc ? 'About ' + money(svc.typical, s.currency) : null]
  ];

  return (
    <div className={'ticket' + (l.urgent ? ' is-urgent' : '') + (compact ? ' compact' : '')}>
      <div className="ticket-head">
        <span>Job ticket</span>
        <StatusPill status={l.status} urgent={l.urgent} />
      </div>
      <div className="ticket-rows">
        {rows.map(([k, v, tone]) => (
          <div key={k} className="ticket-row">
            <span>{k}</span>
            <AnimatePresence mode="wait" initial={false}>
              {v ? (
                <motion.strong key={v} className={tone || undefined} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{v}</motion.strong>
              ) : (
                <strong key="blank" className="ticket-blank" />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {l.reason && l.status === 'lost' && <p className="ticket-note">{l.reason}</p>}
    </div>
  );
}
