import { memo } from 'react';
import { motion } from 'motion/react';
import { DAY, utcDay } from '../lib/format.js';

const WEEKS = 8;

function Pulse({ member, size = 'md', animate = true }) {
  const visited = new Set(member.recentVisits || []);
  const mailDay = member.lastOutreachAt ? utcDay(member.lastOutreachAt) : null;
  const now = Date.now();
  const weeks = [];
  let index = 0;
  for (let w = WEEKS - 1; w >= 0; w--) {
    const days = [];
    for (let d = 6; d >= 0; d--) {
      const key = utcDay(now - (w * 7 + d) * DAY);
      const on = visited.has(key);
      const mail = key === mailDay;
      const after = on && member.cameBack && mailDay && key > mailDay;
      const kind = mail ? (on ? 'mail on' : 'mail') : on ? (after ? 'on back' : 'on') : 'off';
      const tall = on || mail;
      days.push(
        <span key={key} className={'pulse-day ' + kind} title={key + (on ? ': visited' : '') + (mail ? ', win-back email sent' : '')}>
          {tall ? (
            <motion.i
              initial={animate ? { scaleY: 0 } : false}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: animate ? index * 0.012 : 0 }}
            />
          ) : <i />}
        </span>
      );
      index += 1;
    }
    weeks.push(<span key={w} className="pulse-week">{days}</span>);
  }
  return <span className={'pulse pulse-' + size} aria-hidden="true">{weeks}</span>;
}

export default memo(Pulse);
