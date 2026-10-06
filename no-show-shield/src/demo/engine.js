export const MIN = 60000;
export const HOUR = 3600000;
export const DAY = 86400000;

export const DEFAULT_SETTINGS = {
  clinicName: 'Willow Creek Dental',
  shortName: 'Willow Creek Dental',
  clinicPhone: '+15125550142',
  frontDeskName: 'Maria',
  frontDeskPhone: '+15125550143',
  frontDeskEmail: 'frontdesk@example.com',
  address: '2140 Willow Creek Dr, Austin',
  timezone: 'America/Chicago',
  openHour: 8,
  closeHour: 17,
  lunchHour: 12,
  reminderFirst: 72,
  reminderSecond: 24,
  reminderFinal: 2,
  offerBatch: 3,
  offerMinutes: 20,
  minNoticeHours: 2,
  riskCallList: 60,
  quietStart: 20,
  quietEnd: 8,
  autoFill: true,
  minimumNecessary: true,
  aiEnabled: true,
  demoMode: true,
  claudeModel: 'claude-opus-5',
  baselineNoShowRate: 0.17,
  insurers: 'Delta Dental, Cigna, Aetna, MetLife, Guardian, United Concordia',
  parking: 'Free parking right outside, with two accessible spots by the door.',
  templateFirst: 'Hi {first}, it’s {clinic}. You’re booked {when} with {provider}. Reply C to confirm or R to reschedule.',
  templateSecond: 'Hi {first}, see you {when} with {provider} at {clinic}. Reply C to confirm, or R if you need a different time.',
  templateFinal: 'See you at {time} today, {first}. We’re at {address}. Reply L if you’re running late.',
  templateOffer: 'Hi {first}, {clinic} here. A spot just opened {when} with {provider}. Want it? Reply YES to book. The first reply gets it.',
  providers: [
    { key: 'patel', name: 'Dr. Anika Patel', short: 'Dr. Patel', role: 'dentist' },
    { key: 'okafor', name: 'Dr. James Okafor', short: 'Dr. Okafor', role: 'dentist' },
    { key: 'reyes', name: 'Lena Reyes, RDH', short: 'Lena', role: 'hygienist' }
  ],
  types: [
    { key: 'cleaning', name: 'Cleaning and checkup', minutes: 60, value: 185, role: 'hygienist' },
    { key: 'exam', name: 'New patient exam', minutes: 60, value: 260, role: 'dentist' },
    { key: 'filling', name: 'Filling', minutes: 60, value: 320, role: 'dentist' },
    { key: 'crown', name: 'Crown', minutes: 90, value: 1150, role: 'dentist' },
    { key: 'rootcanal', name: 'Root canal', minutes: 90, value: 1080, role: 'dentist' },
    { key: 'whitening', name: 'Whitening', minutes: 60, value: 450, role: 'dentist' },
    { key: 'emergency', name: 'Emergency visit', minutes: 30, value: 220, role: 'dentist' }
  ]
};

let ZONE = null;
const FMT = {};
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const setZone = z => {
  ZONE = z || null;
};

export const zoned = o => (ZONE ? { ...o, timeZone: ZONE } : o);

export function parts(t) {
  const d = new Date(t);
  if (!ZONE) return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), wd: d.getDay() };
  const f = FMT[ZONE] || (FMT[ZONE] = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }));
  const o = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month - 1, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: WD.indexOf(o.weekday) };
}

export function make(y, mo, d, h = 0, mi = 0) {
  if (!ZONE) return new Date(y, mo, d, h, mi, 0, 0).getTime();
  const want = Date.UTC(y, mo, d, h, mi);
  let guess = want;
  for (let i = 0; i < 3; i++) {
    const p = parts(guess);
    guess -= Date.UTC(p.y, p.mo, p.d, p.h, p.mi) - want;
  }
  return guess;
}

export const hourOf = t => parts(t).h;
export const weekdayOf = t => parts(t).wd;

export const dayStart = t => {
  const p = parts(t);
  return make(p.y, p.mo, p.d);
};

export const addDays = (t, n) => {
  const p = parts(t);
  return make(p.y, p.mo, p.d + n, p.h, p.mi);
};

export const atTime = (day, h, m = 0) => {
  const p = parts(day);
  return make(p.y, p.mo, p.d, h, m);
};

export const isWorkday = t => {
  const w = weekdayOf(t);
  return w >= 1 && w <= 5;
};

export const nextWorkday = (t, after = 1) => {
  let d = dayStart(t);
  let n = 0;
  while (n < after) {
    d = addDays(d, 1);
    if (isWorkday(d)) n += 1;
  }
  return d;
};

export const timeLabel = t => new Date(t).toLocaleTimeString('en-US', zoned({ hour: 'numeric', minute: '2-digit' }));

export function dayLabel(t, now = Date.now()) {
  const d = dayStart(t);
  const today = dayStart(now);
  if (d === today) return 'today';
  if (d === addDays(today, 1)) return 'tomorrow';
  return new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'short', month: 'short', day: 'numeric' }));
}

export function whenLabel(t, now = Date.now()) {
  const day = dayLabel(t, now);
  if (day === 'today' || day === 'tomorrow') {
    const wd = new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'short', month: 'short', day: 'numeric' }));
    return day + ', ' + wd + ' at ' + timeLabel(t);
  }
  return day + ' at ' + timeLabel(t);
}

export const providerOf = (s, key) => s.providers.find(p => p.key === key) || s.providers[0];
export const typeOf = (s, key) => s.types.find(t => t.key === key) || s.types[0];
export const NL = String.fromCharCode(10);
const WS = new RegExp('[' + String.fromCharCode(32, 9, 10, 13, 160) + ']+', 'g');

export const firstName = name => String(name || '').trim().split(WS)[0] || 'there';

export function fill(template, vars) {
  return String(template || '').replace(/[{]([a-zA-Z0-9_]+)[}]/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

export function textVars(s, appt, patient, now) {
  return {
    first: firstName(patient.name),
    clinic: s.shortName,
    when: whenLabel(appt.start, now),
    time: timeLabel(appt.start),
    provider: providerOf(s, appt.provider).short,
    address: s.address,
    type: s.minimumNecessary ? 'your appointment' : typeOf(s, appt.type).name.toLowerCase()
  };
}

export const ACTIVE = ['booked', 'confirmed'];
export const occupies = a => ACTIVE.includes(a.status) || a.status === 'completed' || a.status === 'no_show' || a.status === 'arrived';

export function riskOf(appt, patient, now, s = DEFAULT_SETTINGS) {
  const f = [];
  const add = (key, label, points) => f.push({ key, label, points });
  const start = Date.parse(appt.start);
  if (patient.noShows) add('history', patient.noShows === 1 ? 'Missed a visit before' : 'Missed ' + patient.noShows + ' visits before', Math.min(40, 21 * patient.noShows));
  if (patient.lateCancels) add('cancels', patient.lateCancels === 1 ? 'One late cancellation' : patient.lateCancels + ' late cancellations', Math.min(16, 8 * patient.lateCancels));
  const lead = (start - Date.parse(appt.bookedAt)) / DAY;
  if (lead >= 28) add('lead', 'Booked ' + Math.round(lead / 7) + ' weeks ago', 14);
  else if (lead >= 14) add('lead', 'Booked ' + Math.round(lead / 7) + ' weeks ago', 8);
  if (!patient.visits) add('new', 'First visit', 10);
  const pp = parts(start);
  const wd = pp.wd;
  const h = pp.h;
  if (wd === 1 && h < 11) add('slot', 'Monday morning slot', 6);
  else if (wd === 5 && h >= 13) add('slot', 'Friday afternoon slot', 6);
  else if (h === s.openHour) add('slot', 'First slot of the day', 4);
  const r = appt.reminders || {};
  const lastReminder = r.second || r.first;
  if (lastReminder && !appt.confirmedAt && now - Date.parse(lastReminder) > 3 * HOUR) add('silent', 'No reply to the reminder', 22);
  if (appt.confirmedAt) add('confirmed', appt.confirmedBy === 'call' ? 'Confirmed on a call' : appt.confirmedBy === 'move' ? 'Picked this time by text' : 'Confirmed by text', -46);
  if (patient.visits >= 6 && !patient.noShows) add('loyal', 'Reliable regular', -12);
  const score = Math.max(2, Math.min(97, 14 + f.reduce((a, b) => a + b.points, 0)));
  return { score, level: score >= s.riskCallList ? 'high' : score >= 35 ? 'medium' : 'low', factors: f.sort((a, b) => b.points - a.points) };
}

export function canDo(s, providerKey, typeKey) {
  return providerOf(s, providerKey).role === typeOf(s, typeKey).role;
}

export function busy(appts, provider, start, minutes, ignoreId) {
  const a0 = start;
  const a1 = start + minutes * MIN;
  return appts.some(a => {
    if (a.id === ignoreId || a.provider !== provider || !occupies(a)) return false;
    const b0 = Date.parse(a.start);
    const b1 = b0 + a.minutes * MIN;
    return a0 < b1 && b0 < a1;
  });
}

export function fitsHours(s, start, minutes) {
  const pp = parts(start);
  const h0 = pp.h + pp.mi / 60;
  const h1 = h0 + minutes / 60;
  if (!isWorkday(start)) return false;
  if (h0 < s.openHour || h1 > s.closeHour) return false;
  if (h0 < s.lunchHour + 1 && h1 > s.lunchHour) return false;
  return true;
}

export function openSlots(state, opts) {
  const s = state.settings;
  const { minutes, providers, days, from = s.openHour, to = s.closeHour, now, limit = 3, ignoreId } = opts;
  const out = [];
  for (const day of days) {
    for (let h = s.openHour; h < s.closeHour; h += 0.5) {
      if (h < from || h >= to) continue;
      const start = atTime(day, Math.floor(h), h % 1 ? 30 : 0);
      if (start < now + s.minNoticeHours * HOUR) continue;
      if (!fitsHours(s, start, minutes)) continue;
      for (const p of providers) {
        if (busy(state.appts, p, start, minutes, ignoreId)) continue;
        out.push({ provider: p, start: new Date(start).toISOString() });
        break;
      }
    }
  }
  const picked = [];
  for (const o of out) {
    const t = Date.parse(o.start);
    if (picked.some(p => Math.abs(Date.parse(p.start) - t) < 60 * MIN)) continue;
    picked.push(o);
    if (picked.length >= limit) break;
  }
  return picked;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function parsePref(text, now, s = DEFAULT_SETTINGS) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9: ]/g, ' ') + ' ';
  const today = dayStart(now);
  let days = [];
  const named = [];
  DAYS.forEach((d, i) => {
    if (t.includes(' ' + d + ' ') || t.includes(' ' + SHORT[i] + ' ') || t.includes(' ' + d + 's ')) named.push(i);
  });
  const nextWeek = /next week/.test(t);
  if (named.length) {
    for (const wd of named) {
      let d = addDays(today, 1);
      for (let k = 0; k < 7; k++) {
        if (weekdayOf(d) === wd) break;
        d = addDays(d, 1);
      }
      if (nextWeek && d < addDays(today, 7 - weekdayOf(today) + 1)) d = addDays(d, 7);
      days.push(d);
    }
  } else if (/ tomorrow /.test(t)) {
    days.push(addDays(today, 1));
  } else if (/ today | this afternoon | this morning /.test(t)) {
    days.push(today);
  } else if (nextWeek) {
    const mon = addDays(today, ((8 - weekdayOf(today)) % 7) || 7);
    for (let i = 0; i < 5; i++) days.push(addDays(mon, i));
  } else if (/this week|later this week/.test(t)) {
    for (let i = 1; i <= 5; i++) {
      const d = addDays(today, i);
      if (weekdayOf(d) === 6 || weekdayOf(d) === 0) break;
      days.push(d);
    }
  }
  days = days.filter(isWorkday).sort((a, b) => a - b);
  let from = s.openHour;
  let to = s.closeHour;
  let part = null;
  if (/morning| am |early|before lunch/.test(t)) {
    to = s.lunchHour;
    part = 'morning';
  }
  if (/afternoon| pm |after lunch/.test(t)) {
    from = s.lunchHour + 1;
    part = 'afternoon';
  }
  if (/evening|after work|after school|late in the day|end of the day/.test(t)) {
    from = 15;
    part = 'late afternoon';
  }
  const after = t.match(/after ([0-9]{1,2})(?::([0-9][0-9]))?/);
  if (after) {
    let h = Number(after[1]);
    if (h < 8) h += 12;
    from = Math.max(from, h);
    part = 'after ' + timeLabel(atTime(today, h)).replace(':00', '');
  }
  const before = t.match(/before ([0-9]{1,2})(?::([0-9][0-9]))?/);
  if (before) {
    let h = Number(before[1]);
    if (h < 8) h += 12;
    to = Math.min(to, h);
    part = 'before ' + timeLabel(atTime(today, h)).replace(':00', '');
  }
  const has = days.length > 0 || part != null;
  return { days, from, to, part, has };
}

export function searchDays(pref, now, count = 6) {
  if (pref.days.length) return pref.days;
  const out = [];
  let d = dayStart(now);
  if (hourOf(now) < 15) out.push(d);
  while (out.length < count) {
    d = addDays(d, 1);
    if (isWorkday(d)) out.push(d);
  }
  return out.filter(isWorkday);
}

const has = (t, re) => re.test(t);

export function classify(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '').replace(WS, ' ').trim() + ' ';
  const bare = t.trim().replace(/[.!]+$/, '');
  if (/^(stop|unsubscribe|stopall|end|quit)$/.test(bare)) return 'stop';
  if (/^(start|unstop)$/.test(bare)) return 'start';
  if (has(t, /chest pain|cant breathe|can not breathe|cannot breathe|trouble breathing|difficulty breathing|swallow/)) return 'clinical';
  if (has(t, /pain|hurts|hurting|ache|aching|swell|swollen|bleed|blood|fever|infect|abscess|pus|antibiotic|medication|medicine|allerg|numb|throb|broke|broken|cracked|chipped|knocked out|sensitive|is (that|this|it) normal|should i (be|take|worry)/)) return 'clinical';
  if (has(t, /running late|be late|im late|10 min|15 min|5 min|few min|stuck in traffic|on my way|be there in|running behind/) || bare === 'l') return 'late';
  if (has(t, /call me|give me a call|phone me|speak to (someone|a person|a human)|talk to (someone|a person|a human)|real person|bill|billing|invoice|payment plan|refund/)) return 'callback';
  if (/^(r|reschedule)$/.test(bare)) return 'reschedule';
  if (/^(x|cancel)$/.test(bare)) return 'cancel';
  const resched = has(t, /reschedul|move (it|my|the)|change (it|my|the)|another (day|time)|different (day|time)|other (day|time)|cant make|cannot make|can not make|wont make|wont be able|any (other )?(time|slot|chance)|anything (on|for|next|later|earlier)|can we do|could we do|push (it|back)|instead|earlier|later (time|in the)|swap|switch/);
  const cancel = has(t, /cancel|not coming|cant come|cannot come|wont be coming|call it off|no longer need|dont need/);
  if (cancel && !resched) return 'cancel';
  if (resched) return 'reschedule';
  if (/^(c|y|yes|yep|yeah|yup|ok|okay|confirm|confirmed|sure|k|👍)$/.test(bare)) return 'confirm';
  if (has(t, / confirm|see you|ill be there|i will be there|will be there|sounds good|perfect|works for me|all good|yes please| yes /)) return 'confirm';
  if (/^(no|n|nope|no thanks|pass)$/.test(bare) || has(t, /no thank|not this time|cant take it|ill pass/)) return 'decline';
  if (has(t, /park|insur|accept|in network|delta|cigna|aetna|metlife|guardian|concordia|bring|how long|address|where are you|location|directions|cost|price|how much|kids|child|x-ray|xray|wheelchair|accessib/)) return 'question';
  if (has(t, /thank|thanks|thx|great|cool|awesome|appreciate/)) return 'thanks';
  return 'other';
}

export function pickOption(text, options) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  if (/(?<![a-z0-9])(1|one|first)(?![a-z0-9])|1st|^ *a *$/.test(t)) return 0;
  if (/(?<![a-z0-9])(2|two|second)(?![a-z0-9])|2nd/.test(t) && options.length > 1) return 1;
  if (/(?<![a-z0-9])(3|three|third|last)(?![a-z0-9])|3rd/.test(t) && options.length > 2) return 2;
  const tm = t.match(/([0-9]{1,2})(?::([0-9][0-9]))? *(am|pm)?/);
  if (tm) {
    let h = Number(tm[1]);
    const m = Number(tm[2] || 0);
    if (tm[3] === 'pm' && h < 12) h += 12;
    if (!tm[3] && h < 8) h += 12;
    const i = options.findIndex(o => {
      const pp = parts(o.start);
      return pp.h === h && pp.mi === m;
    });
    if (i >= 0) return i;
  }
  for (let i = 0; i < options.length; i++) {
    const wd = DAYS[weekdayOf(options[i].start)];
    if (t.includes(wd) || t.includes(' ' + wd.slice(0, 3) + ' ')) {
      const same = options.filter(o => DAYS[weekdayOf(o.start)] === wd);
      if (same.length === 1) return i;
    }
  }
  if (/works|good|perfect|great|take it|book it|that one|fine/.test(t) && options.length === 1) return 0;
  return -1;
}

export function faq(text, s, appt) {
  const t = String(text || '').toLowerCase();
  const out = [];
  if (/park/.test(t)) out.push(s.parking);
  if (/insur|accept|in network|delta|cigna|aetna|metlife|guardian|concordia/.test(t)) {
    const list = s.insurers.split(',').map(x => x.trim()).filter(Boolean);
    const named = list.find(n => t.includes(n.toLowerCase().split(' ')[0]));
    out.push(named ? 'Yes, we’re in network with ' + named + '. Bring your card and we’ll handle the claim.' : 'We’re in network with ' + list.slice(0, 4).join(', ') + ' and more. The front desk can check your plan before the visit.');
  }
  if (/bring/.test(t)) out.push('Just bring a photo ID, your insurance card and a list of any medicines you take.');
  if (/how long/.test(t) && appt) out.push('Plan for about ' + appt.minutes + ' minutes.');
  if (/address|where are you|location|directions/.test(t)) out.push('We’re at ' + s.address + '.');
  if (/cost|price|how much/.test(t)) out.push('Costs depend on your plan, so the front desk will go through them with you before any treatment starts.');
  if (/kids|child/.test(t)) out.push('Yes, we see children from age 3.');
  if (/x-ray|xray/.test(t)) out.push('If x-rays are due, they take about 10 minutes and are covered by most plans.');
  if (/wheelchair|accessib/.test(t)) out.push('Yes, the clinic is step-free with an accessible restroom.');
  return out.join(' ');
}

export const INTENT = {
  confirm: { label: 'Confirmed', tone: 'good' },
  reschedule: { label: 'Rescheduled', tone: 'blue' },
  cancel: { label: 'Cancelled', tone: 'amber' },
  question: { label: 'Asked a question', tone: 'violet' },
  clinical: { label: 'Clinical concern', tone: 'red' },
  late: { label: 'Running late', tone: 'cyan' },
  callback: { label: 'Wants a call', tone: 'pink' },
  accept: { label: 'Took an open spot', tone: 'good' },
  decline: { label: 'Said no', tone: 'quiet' },
  taken: { label: 'Offer already taken', tone: 'quiet' },
  stop: { label: 'Opted out', tone: 'quiet' },
  other: { label: 'Other', tone: 'quiet' }
};

export function phoneLabel(p) {
  const d = String(p || '').replace(/[^0-9]/g, '').replace(/^1(?=[0-9]{10}$)/, '');
  if (d.length !== 10) return p || '';
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}
