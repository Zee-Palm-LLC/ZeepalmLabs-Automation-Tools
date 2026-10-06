export const SCENARIOS = [
  { key: 'confirm', label: 'Confirms', name: 'Sam Carter', blurb: 'Gets the reminder and confirms with one letter.', lines: ['C'] },
  { key: 'reschedule', label: 'Reschedules', name: 'Jordan Lee', blurb: 'Can’t make it, asks for another day in plain words.', lines: ['Can’t make it then, sorry. Anything {day} afternoon?', '2 works'] },
  { key: 'waitlist', label: 'Takes a cancelled spot', name: 'Taylor Brooks', blurb: 'Is on the waitlist when someone else cancels.', lines: ['YES'] },
  { key: 'question', label: 'Asks a question', name: 'Alex Rivera', blurb: 'Asks about parking and insurance, then confirms.', lines: ['Is there parking? And do you take Delta Dental?', 'C'] },
  { key: 'clinical', label: 'Has a concern', name: 'Chris Morgan', blurb: 'Describes a symptom. The AI stays out of medicine.', lines: ['My jaw has been swollen since last night and it really hurts. Is that normal?', 'Ok, thank you'] },
  { key: 'own', label: 'Type my own', name: 'Robin Avery', blurb: 'Reply however you like.', manual: true }
];
