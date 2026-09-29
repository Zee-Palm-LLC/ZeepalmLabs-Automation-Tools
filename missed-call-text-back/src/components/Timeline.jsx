import { PhoneX, ChatText, ChatCircle, Brain, Siren, CalendarDots, CheckCircle } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { gap, slotLabel, money } from '../lib/format.js';

export function rescueSteps(lead, call, msgs, settings, now) {
  const callAt = call ? Date.parse(call.at) : lead ? Date.parse(lead.createdAt) : now;
  const out = msgs.filter(m => m.dir === 'out');
  const firstOut = out[0];
  const firstIn = msgs.find(m => m.dir === 'in');
  const afterIn = firstIn ? out.find(m => Date.parse(m.at) > Date.parse(firstIn.at)) : null;
  const alert = msgs.find(m => m.dir === 'note' && /alerted/i.test(m.body));
  const offerMsg = out.find(m => /I can do|How about/.test(m.body));
  const bookedNote = msgs.find(m => m.dir === 'note' && /^(Booked|Emergency visit)/.test(m.body)) || msgs.find(m => m.dir === 'note' && /booked/i.test(m.body));
  const at = m => (m ? gap(Date.parse(m.at) - callAt) : null);
  const owner = settings.ownerName;
  const urgent = lead && lead.urgent;
  const steps = [
    { key: 'missed', icon: PhoneX, title: 'Call missed', idle: 'The phone rings out while the team is busy', done: !!lead, stamp: lead ? '0s' : null, detail: 'Nobody could pick up' },
    { key: 'text', icon: ChatText, title: 'Texted back', idle: 'An SMS goes out a few seconds later', done: !!firstOut, stamp: at(firstOut), detail: 'Before they call the next plumber on Google' },
    { key: 'reply', icon: ChatCircle, title: 'Customer replied', idle: 'They answer in their own words', done: !!firstIn, stamp: at(firstIn), detail: firstIn ? '"' + trim(firstIn.body, 64) + '"' : '' },
    { key: 'understood', icon: Brain, title: 'Job worked out', idle: 'AI reads the problem, urgency and area', done: !!(afterIn && lead && lead.service), stamp: at(afterIn), detail: lead && lead.issue ? lead.issue + (lead.urgency ? ', ' + (lead.urgency === 'emergency' ? 'emergency' : lead.urgency === 'soon' ? 'needs doing soon' : 'routine') : '') : '' }
  ];
  if (urgent) {
    steps.push({ key: 'alert', icon: Siren, title: owner + ' alerted', idle: '', done: !!alert, stamp: at(alert), detail: 'A text to ' + owner + "'s mobile straight away" });
  } else {
    steps.push({ key: 'offer', icon: CalendarDots, title: 'Times offered', idle: 'Open slots come straight from the schedule', done: !!offerMsg, stamp: at(offerMsg), detail: lead && lead.offered && lead.offered.length ? lead.offered.length + ' open slots from the schedule' : '' });
  }
  const booked = !!(bookedNote && lead && lead.status === 'booked');
  steps.push({ key: 'booked', icon: CheckCircle, title: urgent ? 'Emergency visit booked' : 'Job booked', idle: 'The job lands in the calendar', done: booked, stamp: at(bookedNote), detail: booked && lead.slot ? cap(slotLabel(lead.slot, Date.parse(bookedNote.at))) + ', ' + money(lead.value, settings.currency) + ' job' : '' });
  return steps;
}

const trim = (s, n) => (s.length > n ? s.slice(0, n - 1) + '...' : s);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export default function Timeline() {
  const { sim, data, now, visible } = useDesk();
  const lead = sim.leadId ? data.leads.find(l => l.id === sim.leadId) : null;
  const call = lead ? data.calls.find(c => c.leadId === lead.id) : null;
  const msgs = lead ? visible(lead.id) : [];
  const steps = rescueSteps(lead, call, msgs, data.settings, now);
  const active = sim.phase === 'dial' ? -1 : steps.findIndex(s => !s.done);
  const ringing = sim.phase === 'ringing';

  return (
    <ol className="rescue" aria-live="polite">
      {steps.map((s, i) => {
        const state = s.done ? 'done' : i === active && !ringing ? 'now' : i === 0 && ringing ? 'now' : 'todo';
        const Icon = s.icon;
        return (
          <li key={s.key} className={'rescue-step is-' + state}>
            <span className="rescue-dot"><Icon size={16} weight={s.done ? 'fill' : 'bold'} /></span>
            <div className="rescue-text">
              <div className="rescue-row">
                <strong>{s.title}</strong>
                {s.done && s.stamp && <span className="rescue-stamp">{s.stamp}</span>}
              </div>
              <p>{s.done ? s.detail : s.idle || s.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
