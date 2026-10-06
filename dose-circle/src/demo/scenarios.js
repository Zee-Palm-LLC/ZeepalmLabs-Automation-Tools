export const SCENARIOS = [
  { key: 'taken', label: 'Takes them', blurb: 'Mom gets her reminder and answers in her own words.', steps: [{ who: 'person', text: 'Took them, thank you dear' }] },
  { key: 'quiet', label: 'Goes quiet', blurb: 'No reply after the nudge, so Ana gets a text.', steps: [{ who: 'member', text: 'On it, calling her now' }, { who: 'person', text: 'Sorry! I was out in the garden. Taking them now', fresh: false, gap: 3400 }] },
  { key: 'partial', label: 'Skips one', blurb: 'Leaves one pill out and says why.', steps: [{ who: 'person', text: 'Took them but not {skip}, it upsets my stomach' }] },
  { key: 'reading', label: 'Sends a reading', blurb: 'Texts a blood pressure above the family’s limit.', steps: [{ who: 'person', text: 'Took them. My blood pressure is 172/104' }, { who: 'member', text: 'Thanks, I’ll call her' }] },
  { key: 'low', label: 'Running low', blurb: 'Says she’s almost out. Ana orders the refill.', steps: [{ who: 'person', text: 'Done. Only 3 of {low} left' }, { who: 'member', text: 'Ordered, I’ll pick it up tomorrow' }] },
  { key: 'urgent', label: 'Feels unwell', blurb: 'Describes chest symptoms. Everyone hears at once.', steps: [{ who: 'person', text: 'I feel dizzy and my chest feels tight' }, { who: 'member', text: 'On it, calling her now' }] },
  { key: 'own', label: 'Type my own', blurb: 'Reply as Mom or as Ana, however you like.', manual: true }
];
