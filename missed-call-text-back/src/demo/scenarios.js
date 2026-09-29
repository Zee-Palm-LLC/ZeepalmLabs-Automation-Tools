export const SCENARIOS = [
  {
    key: 'drain',
    label: 'Blocked drain',
    lines: {
      issue: "Hi, my kitchen sink is completely blocked and won't drain",
      zip: '78704',
      slot: 'Tomorrow morning works',
      name: 'Sam Carter',
      done: 'Perfect, thank you!'
    }
  },
  {
    key: 'burst',
    label: 'Burst pipe',
    lines: {
      issue: 'Pipe just burst under the kitchen sink, water everywhere!!',
      zip: '1402 Maple St, 78745',
      done: 'Thank you, the water is off now'
    }
  },
  {
    key: 'heater',
    label: 'No hot water',
    lines: {
      issue: 'No hot water since this morning. How much do you charge?',
      zip: "It's 78613",
      slot: 'Afternoon if possible',
      name: "It's Priya Patel",
      done: 'Are you licensed?'
    }
  },
  { key: 'own', label: 'Type my own', manual: true }
];

export function nextLine(scenario, stage, lead, used) {
  if (!scenario || scenario.manual) return null;
  const l = scenario.lines;
  if (stage === 'issue') return used.issue ? null : l.issue;
  if (stage === 'zip') return used.zip ? null : l.zip;
  if (stage === 'slot') return used.slot >= 2 ? null : used.slot ? 'The first one works' : l.slot || 'The first one works';
  if (stage === 'name') return used.name ? null : l.name;
  if (stage === 'done' && lead.status === 'booked') return used.done ? null : l.done;
  return null;
}
