export const MIN = 60000;
export const DAY = 86400000;

export const DEFAULT_SERVICES = [
  { key: 'leak', name: 'Burst or leaking pipe', from: 149, typical: 480, urgent: true },
  { key: 'drain', name: 'Blocked drain', from: 129, typical: 260 },
  { key: 'heater', name: 'Water heater repair', from: 189, typical: 690 },
  { key: 'heating', name: 'No heat or furnace repair', from: 159, typical: 380 },
  { key: 'toilet', name: 'Toilet repair', from: 99, typical: 190 },
  { key: 'faucet', name: 'Faucet or sink repair', from: 99, typical: 170 },
  { key: 'install', name: 'New fixture install', from: 0, typical: 650 },
  { key: 'gas', name: 'Gas leak', from: 0, typical: 350, urgent: true },
  { key: 'other', name: 'General plumbing', from: 119, typical: 240 }
];

export const DEFAULT_SETTINGS = {
  businessName: 'BrightFlow Plumbing & Heating',
  shortName: 'BrightFlow',
  ownerName: 'Dan',
  ownerPhone: '+15125550100',
  ownerEmail: 'owner@your-business.com',
  businessPhone: '+15125550123',
  currency: '$',
  timezone: 'America/Chicago',
  areaLabel: 'Austin, Cedar Park and Round Rock',
  serviceZips: '787, 78613, 78664, 78665, 78681',
  weekdayHours: '07:00-18:00',
  saturdayHours: '08:00-13:00',
  slotTimes: '08:00, 10:30, 13:00, 15:30',
  vans: 2,
  ringSeconds: 20,
  textBack: "Hi, it's {business}. Sorry we missed your call, we're out on a job right now. What can we help with? Reply here and I'll get you sorted.",
  afterHours: "Hi, it's {business}. Sorry we missed your call, we're closed right now but we still handle emergencies. What's going on? Reply here and I'll get you sorted.",
  followUpMinutes: 30,
  finalFollowUpHours: 20,
  aiEnabled: true,
  demoMode: true,
  claudeModel: 'claude-opus-5',
  services: DEFAULT_SERVICES
};

export const OPEN_STATUSES = ['texted', 'chatting', 'urgent'];

const hm = s => {
  const [h, m] = String(s).trim().split(':').map(Number);
  return h * 60 + (m || 0);
};

function hoursRange(str) {
  const [a, b] = String(str || '').split('-');
  if (!a || !b) return null;
  return [hm(a), hm(b)];
}

export function openRange(settings, date) {
  const d = date.getDay();
  if (d === 0) return null;
  return hoursRange(d === 6 ? settings.saturdayHours : settings.weekdayHours);
}

export function isOpen(settings, t) {
  const d = new Date(t);
  const r = openRange(settings, d);
  if (!r) return false;
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= r[0] && m < r[1];
}

export function slotMinutes(settings) {
  return String(settings.slotTimes || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(hm)
    .sort((a, b) => a - b);
}

const startOfDay = t => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function dayDiff(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY);
}

export function freeSlots(settings, leads, from, count = 3, pref = {}) {
  const taken = {};
  for (const l of leads) {
    if (l.slot && l.status === 'booked' && !l.urgent) taken[l.slot] = (taken[l.slot] || 0) + 1;
  }
  const cap = Math.max(1, Number(settings.vans) || 1);
  const base = new Date(from);
  const out = [];
  for (let i = 0; i < 21 && out.length < count; i++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const r = openRange(settings, day);
    if (!r) continue;
    if (pref.dayOffset != null && dayDiff(from, day.getTime()) !== pref.dayOffset) continue;
    if (pref.weekday != null && day.getDay() !== pref.weekday) continue;
    for (const m of slotMinutes(settings)) {
      if (m < r[0] || m + 60 > r[1]) continue;
      if (pref.part === 'morning' && m >= 720) continue;
      if (pref.part === 'afternoon' && m < 720) continue;
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60).getTime();
      if (t < from + 90 * MIN) continue;
      if (pref.after && t <= pref.after) continue;
      const iso = new Date(t).toISOString();
      if ((taken[iso] || 0) >= cap) continue;
      out.push(iso);
      if (out.length >= count) break;
    }
  }
  return out;
}

export function timeLabel(t) {
  const d = new Date(t);
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  return hh + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm');
}

export function dayLabel(t, now) {
  const diff = dayDiff(now, t);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  const d = new Date(t);
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function slotLabel(t, now) {
  return dayLabel(t, now) + ' at ' + timeLabel(t);
}

export function listSlots(isos, now) {
  const groups = [];
  for (const iso of isos) {
    const d = dayLabel(iso, now);
    const g = groups[groups.length - 1];
    if (g && g.day === d) g.times.push(timeLabel(iso));
    else groups.push({ day: d, times: [timeLabel(iso)] });
  }
  const parts = groups.map(g => g.day + ' at ' + orList(g.times));
  if (parts.length === 1) return parts[0];
  if (groups.some(g => g.times.length > 1)) return parts.slice(0, -1).join(', ') + ', or ' + parts[parts.length - 1];
  return orList(parts);
}

function orList(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' or ' + items[items.length - 1];
}

const hoursText = str => {
  const r = hoursRange(str);
  if (!r) return 'closed';
  const f = m => {
    const d = new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
    return timeLabel(d.getTime());
  };
  return f(r[0]) + ' to ' + f(r[1]);
};

export function covers(settings, zip) {
  return String(settings.serviceZips || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .some(p => zip.startsWith(p));
}

export function serviceOf(settings, key) {
  const list = settings.services && settings.services.length ? settings.services : DEFAULT_SERVICES;
  return list.find(s => s.key === key) || list.find(s => s.key === 'other') || DEFAULT_SERVICES[DEFAULT_SERVICES.length - 1];
}

export function fill(template, settings) {
  return String(template || '').replaceAll('{business}', settings.shortName || settings.businessName).replaceAll('{owner}', settings.ownerName);
}

export function textBackMessage(settings, t) {
  return fill(isOpen(settings, t) ? settings.textBack : settings.afterHours, settings);
}

export function followUpMessage(settings, n) {
  if (n === 1) return 'Just checking in, do you still need a hand? Reply here and we can usually get someone out within a day.';
  return "Last text from us, promise. If you still need a plumber, just reply and we'll fit you in.";
}

const EMERGENCY = /\b(burst|bursted|flood\w*|gushing|pouring|spraying|everywhere|ceiling|won'?t stop|can'?t stop|sewage|overflow\w*)\b/i;
const SOON = /\b(no hot water|no heat|today|asap|urgent|emergency|right now|freezing|backed up|backing up|baby|elderly)\b/i;
const CATS = [
  ['heater', /\b(water heater|hot water|heater|tankless|water tank)\b/i],
  ['heating', /\b(furnace|no heat|heating|boiler|radiators?)\b/i],
  ['drain', /\b(drains?|draining|clog\w*|blocked|backed up|backing up|sewer|gurgl\w*)\b/i],
  ['toilet', /\b(toilets?|flush\w*)\b/i],
  ['install', /\b(install\w*|remodel\w*|renovat\w*|replace\w*|new (sink|toilet|faucet|shower|tub|bath\w*))\b/i],
  ['faucet', /\b(faucets?|taps?|sinks?|shower ?heads?|spigot|hose bib)\b/i],
  ['leak', /\b(leak\w*|pipes?|drip\w*|water damage)\b/i]
];

export function classify(text) {
  const t = String(text);
  if (/\bgas\b/i.test(t) && /\b(smell\w*|leak\w*|hiss\w*)\b/i.test(t)) return { key: 'gas', urgency: 'emergency' };
  if (EMERGENCY.test(t) && /\b(pipe|water|leak\w*|burst|flood\w*|ceiling|sewage|toilet|overflow\w*)\b/i.test(t)) return { key: 'leak', urgency: 'emergency' };
  for (const [key, re] of CATS) {
    if (re.test(t)) return { key, urgency: SOON.test(t) ? 'soon' : 'routine' };
  }
  if (/\b(quote|estimate)\b/i.test(t)) return { key: 'install', urgency: 'routine' };
  if (t.split(/\s+/).length >= 7) return { key: 'other', urgency: SOON.test(t) ? 'soon' : 'routine' };
  return null;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function parsePref(text) {
  const t = String(text).toLowerCase();
  const pref = {};
  if (/\btoday\b|\basap\b|\bsoonest\b|\bearliest\b/.test(t)) pref.dayOffset = 0;
  if (/\btomorrow\b/.test(t)) pref.dayOffset = 1;
  WEEKDAYS.forEach((w, i) => {
    if (new RegExp('\\b(' + w + '|' + w.slice(0, 3) + ')\\b').test(t)) pref.weekday = i;
  });
  if (/\bmorning\b|\bam\b/.test(t)) pref.part = 'morning';
  if (/\bafternoon\b|\bpm\b|after (lunch|work)/.test(t)) pref.part = 'afternoon';
  if (/\bearliest\b|\bsoonest\b|\basap\b/.test(t)) delete pref.dayOffset;
  return pref;
}

const NAME_STOP = /^(hi|hey|hello|in|at|on|the|a|an|having|looking|calling|not|so|just|still|here|home|out|about|trying|sure|ok|okay|yes|no|good|fine|getting|going)$/i;

export function findName(text) {
  const m = String(text).match(/\b(?:this is|my name is|name's|i'm|i am|it's)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/);
  if (!m || NAME_STOP.test(m[1])) return null;
  return [m[1], m[2]].filter(Boolean).join(' ');
}

export function cleanName(text) {
  let t = String(text).trim().replace(/[.!]+$/, '');
  t = t.replace(/^(it'?s|its|my name is|name'?s|i'?m|i am|this is|put it under|under|for)\s+/i, '').trim();
  t = t.replace(/[,\s]+(please|pls|thanks|thank you|thx)$/i, '').trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 3) return null;
  if (!words.every(w => /^[a-z][a-z'-]*$/i.test(w))) return null;
  if (words.some(w => NAME_STOP.test(w))) return null;
  return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function faq(settings, lead, t) {
  if (/\b(licen[cs]ed|insured|insurance|bonded)\b/.test(t)) {
    return "Yes, we're fully licensed and insured, and every job comes with a one-year workmanship guarantee.";
  }
  if (/\b(how much|price|pricing|cost|charge|fee|expensive|rates?)\b/.test(t)) {
    const s = lead.service ? serviceOf(settings, lead.service) : null;
    if (s && s.from) return 'Pricing for ' + s.name.toLowerCase() + ' starts at ' + settings.currency + s.from + ', and we always confirm the price before we start.';
    if (s) return 'That one needs a quick look first, and quotes are free. We always confirm the price before we start.';
    return 'Most jobs start between ' + settings.currency + '99 and ' + settings.currency + '189 depending on the problem, and we always confirm the price before we start.';
  }
  if (/\b(hours|open|close|closed|weekends?|saturday|sunday)\b/.test(t) && /\?|what|when|are you|do you/.test(t)) {
    return "We're open Monday to Friday " + hoursText(settings.weekdayHours) + ' and Saturday ' + hoursText(settings.saturdayHours) + ', and we take emergencies around the clock.';
  }
  if (/(do you (cover|service|come to|go to|work in)|service area|what areas|how far)/.test(t)) {
    return 'We cover ' + settings.areaLabel + '.';
  }
  return null;
}

export function stageOf(lead) {
  if (['booked', 'lost', 'opted_out'].includes(lead.status)) return 'done';
  if (!lead.service) return 'issue';
  if (!lead.zip && !(lead.urgent && lead.address)) return 'zip';
  if (lead.urgent) return 'done';
  if (!lead.slot) return 'slot';
  if (!lead.name) return 'name';
  return 'done';
}

function pickSlot(offered, text, now) {
  const t = String(text).toLowerCase().trim();
  if (!offered || !offered.length) return null;
  const tm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (tm && !/^\d{5}$/.test(tm[0])) {
    let h = Number(tm[1]);
    const m = Number(tm[2] || 0);
    if (h >= 1 && h <= 12 && (tm[2] || tm[3] || h >= 7)) {
      const cands = offered.filter(iso => {
        const d = new Date(iso);
        const hh = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
        const pmOk = !tm[3] || (tm[3] === 'pm') === d.getHours() >= 12;
        return hh === h && d.getMinutes() === m && pmOk;
      });
      if (cands.length) return narrowByDay(cands, t, now)[0];
    }
  }
  const byDay = narrowByDay(offered, t, now);
  if (byDay.length && byDay.length < offered.length) {
    if (/\bmorning\b/.test(t)) return byDay.find(i => new Date(i).getHours() < 12) || null;
    if (/\bafternoon\b/.test(t)) return byDay.find(i => new Date(i).getHours() >= 12) || null;
    return byDay[0];
  }
  if (/\bmorning\b/.test(t)) return offered.find(i => new Date(i).getHours() < 12) || null;
  if (/\bafternoon\b/.test(t)) return offered.find(i => new Date(i).getHours() >= 12) || null;
  if (/\b(first|earliest|soonest|asap|1st)\b/.test(t) || /^(1|one|option 1|#1)\b/.test(t)) return offered[0];
  if (/\b(second|middle|2nd)\b/.test(t) || /^(2|two|option 2|#2)\b/.test(t)) return offered[1] || null;
  if (/\b(third|last|3rd)\b/.test(t) || /^(3|three|option 3|#3)\b/.test(t)) return offered[2] || null;
  if (offered.length === 1 && /^(yes|yep|yeah|sure|ok|okay|perfect|great|works|that works|sounds good)\b/.test(t)) return offered[0];
  return null;
}

function narrowByDay(list, t, now) {
  let out = list;
  if (/\btoday\b/.test(t)) out = out.filter(i => dayDiff(now, i) === 0);
  else if (/\btomorrow\b/.test(t)) out = out.filter(i => dayDiff(now, i) === 1);
  else {
    const w = WEEKDAYS.findIndex(d => new RegExp('\\b(' + d + '|' + d.slice(0, 3) + ')\\b').test(t));
    if (w >= 0) out = out.filter(i => new Date(i).getDay() === w);
  }
  return out;
}

export function respond({ settings, lead, leads, text, now }) {
  const body = String(text || '').trim();
  const t = body.toLowerCase();
  const L = { ...lead };
  const out = { replies: [], patch: {}, events: [] };
  const set = (k, v) => {
    L[k] = v;
    out.patch[k] = v;
  };
  const say = m => out.replies.push(m);
  const owner = settings.ownerName;
  const cur = settings.currency;

  if (/^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(body)) {
    set('status', 'opted_out');
    say("You're unsubscribed and won't get more texts from us. Reply START if you change your mind.");
    return out;
  }
  if (L.status === 'opted_out') {
    if (/^(start|unstop|yes)$/i.test(body)) {
      set('status', 'chatting');
      say("You're back in. What can we help with?");
    }
    return out;
  }
  if (L.status === 'texted' || L.status === 'no_reply') set('status', 'chatting');

  const early = findName(body);
  if (early && !L.name) set('name', early);
  const pref = parsePref(body);
  if (Object.keys(pref).length) set('pref', { ...(L.pref || {}), ...pref });

  if (/(already (found|got|booked|have|called) (someone|somebody|a plumber|another)|found someone|never ?mind|no longer need|don'?t need (it|you|anyone)|all good now|fixed it|sorted now|figured it out|went with someone)/.test(t)) {
    set('status', 'lost');
    set('reason', 'Went elsewhere or fixed it');
    set('slot', null);
    say("No problem at all, glad you're sorted. Save this number in case you ever need us.");
    return out;
  }

  if (/(call me|give me a call|ring me|speak (to|with)|talk (to|with)|real person|a human|someone call|can (dan|someone|somebody) call)/.test(t)) {
    set('needsCall', true);
    set('ack', false);
    out.events.push({ kind: 'call', text: 'Asked for a call back' });
    say("No problem. I've asked " + owner + ' to call you back as soon as the current job wraps up, usually within the hour.');
    return out;
  }

  const answer = faq(settings, L, t);
  const stage = stageOf(L);

  if (stage === 'done') {
    if (L.status === 'booked' && /(change|reschedule|move (it|the)|different (time|day)|another (time|day)|can'?t make)/.test(t)) {
      const offered = freeSlots(settings, leads.filter(x => x.id !== L.id), now, 3, L.pref || {});
      set('slot', null);
      set('status', 'chatting');
      set('offered', offered);
      say('No problem. I can do ' + listSlots(offered, now) + '. Which works better?');
      return out;
    }
    if (L.status === 'booked' && /\bcancel\b/.test(t)) {
      set('status', 'lost');
      set('reason', 'Cancelled');
      set('slot', null);
      say("Done, I've cancelled it. Text this number any time you need us.");
      return out;
    }
    if (answer) {
      say(answer);
      return out;
    }
    if (/\b(thanks|thank you|thx|ty|cheers|great|perfect|awesome|appreciate)\b/.test(t)) {
      if (L.urgent) say("You're welcome. " + owner + ' is on the way and will call when close.');
      else if (L.slot) say("You're welcome! See you " + slotLabel(L.slot, now) + '.');
      else say("You're welcome!");
      return out;
    }
    say("Thanks, I've passed that on to " + owner + '.');
    out.events.push({ kind: 'note', text: 'Sent a note after booking' });
    return out;
  }

  if (stage === 'issue') {
    const c = classify(body);
    if (!c) {
      if (answer) say(answer + ' What problem are you having?');
      else say('Thanks! Can you tell me a bit about the problem? For example a leak, a blocked drain, no hot water or a new install.');
      return out;
    }
    const svc = serviceOf(settings, c.key);
    set('service', svc.key);
    set('issue', svc.name);
    set('urgency', c.urgency);
    set('summary', body.length > 90 ? body.slice(0, 88) + '...' : body);
    const zipHit = body.match(/\b(\d{5})(?:-\d{4})?\b/);

    if (c.key === 'gas') {
      set('urgent', true);
      set('status', 'urgent');
      set('ack', false);
      out.events.push({ kind: 'urgent', text: 'Possible gas leak' });
      say("Please leave the house now and don't touch light switches or anything with a flame. From outside, call 911 or your gas company's emergency line.");
      say("I've alerted " + owner + ' too. What\'s the address?');
      if (zipHit) return dispatch(zipHit[1]);
      return out;
    }
    if (c.urgency === 'emergency') {
      set('urgent', true);
      set('status', 'urgent');
      set('ack', false);
      out.events.push({ kind: 'urgent', text: svc.name + ', emergency' });
      say("That sounds urgent. I've just alerted " + owner + ', our on-call plumber, who will call you within 10 minutes.');
      if (zipHit) return dispatch(zipHit[1]);
      say("While you wait, turn off the main water valve. It's usually under the kitchen sink or where the pipe comes into the house. What's the address or ZIP code?");
      return out;
    }
    const ack = {
      drain: 'Blocked drains are the worst. We clear most of them in one visit.',
      heater: /no hot water/i.test(body) ? "No hot water is no fun, let's get that fixed fast." : 'Got it, water heater trouble.',
      heating: "No heat, got it. Let's get someone out to you quickly.",
      toilet: "Got it, toilet trouble. That's usually a quick fix.",
      faucet: "Got it, that's usually a quick fix.",
      install: 'Happy to help with that, and quotes are free.',
      leak: "A leak, got it. It's worth getting that looked at soon.",
      other: 'Got it, thanks for the details.'
    }[svc.key];
    const price = svc.from ? ' Visits for that start at ' + cur + svc.from + ', and we confirm the price before we start.' : '';
    if (zipHit) return offer(zipHit[1], ack + price);
    say(ack + price + " What's your ZIP code? I'll check we cover you and find a time.");
    return out;
  }

  if (stage === 'zip') {
    const zipHit = body.match(/\b(\d{5})(?:-\d{4})?\b/);
    const street = /\b\d+\s+[a-z0-9 .'-]+\s(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|way|ct|court|pl|place|pkwy|trail|trl|cv|cove)\b/i.test(body);
    if (L.urgent && (zipHit || street)) return dispatch(zipHit ? zipHit[1] : null, street ? body : null);
    if (zipHit) return offer(zipHit[1], '');
    if (street) {
      set('address', body.replace(/\s+/g, ' ').slice(0, 80));
      say('Thanks! And the ZIP code?');
      return out;
    }
    if (L.urgent) say((answer ? answer + ' ' : '') + "What's the address or ZIP code? " + owner + ' needs it to get to you.');
    else say((answer ? answer + ' ' : '') + "What's the ZIP code for the job? Then I can check we cover you.");
    return out;
  }

  if (stage === 'slot') {
    const others = leads.filter(x => x.id !== L.id);
    if (/(none|neither|no good|don'?t work|doesn'?t work|can'?t do|later|next week|other times?|anything else|another day|different)/.test(t)) {
      const p = { ...parsePref(body) };
      const last = (L.offered || []).slice(-1)[0];
      let offered = freeSlots(settings, others, now, 3, { ...p, after: last ? Date.parse(last) : undefined });
      if (!offered.length) offered = freeSlots(settings, others, now, 3, { after: last ? Date.parse(last) : undefined });
      set('offered', offered);
      say('How about ' + listSlots(offered, now) + '?');
      return out;
    }
    const picked = pickSlot(L.offered, body, now);
    if (picked) {
      set('slot', picked);
      if (L.name) return book();
      say(cap(slotLabel(picked, now)) + ' it is. What name should I put the booking under?');
      return out;
    }
    if (Object.keys(pref).length) {
      let offered = freeSlots(settings, others, now, 3, pref);
      if (offered.length) {
        set('offered', offered);
        say((offered.length === 1 ? 'The closest I have is ' : 'I can do ') + listSlots(offered, now) + '. Does that work?');
        return out;
      }
    }
    say((answer ? answer + ' ' : '') + 'Which time works best: ' + listSlots(L.offered || [], now) + '? You can just reply 1, 2 or 3.');
    return out;
  }

  if (stage === 'name') {
    const n = findName(body) || cleanName(body);
    if (!n) {
      say((answer ? answer + ' ' : '') + 'What name should I put the booking under?');
      return out;
    }
    set('name', n);
    return book();
  }

  return out;

  function offer(zip, lead) {
    if (!covers(settings, zip)) {
      set('zip', zip);
      set('status', 'lost');
      set('reason', 'Outside the service area');
      say((lead ? lead + ' ' : '') + "Sorry, we don't cover " + zip + '. We work across ' + settings.areaLabel + ', so a plumber closer to you will be your fastest option.');
      return out;
    }
    set('zip', zip);
    const others = leads.filter(x => x.id !== L.id);
    let offered = freeSlots(settings, others, now, 3, L.pref || {});
    if (!offered.length) offered = freeSlots(settings, others, now, 3, {});
    if (!offered.length) {
      set('needsCall', true);
      set('ack', false);
      say((lead ? lead + ' ' : '') + "We're fully booked right now, so I've asked " + owner + ' to call you and squeeze you in.');
      return out;
    }
    set('offered', offered);
    say((lead ? lead + ' ' : '') + 'We cover ' + zip + '. I can do ' + listSlots(offered, now) + '. Which works best?');
    return out;
  }

  function dispatch(zip, address) {
    if (address) set('address', address.replace(/\s+/g, ' ').slice(0, 80));
    if (zip && !covers(settings, zip)) {
      set('zip', zip);
      set('needsCall', true);
      say("We don't normally cover " + zip + ', but ' + owner + ' has your number and will call you in a few minutes to help.');
      return out;
    }
    if (zip) set('zip', zip);
    const svc = serviceOf(settings, L.service);
    set('status', 'booked');
    set('slot', new Date(now + 45 * MIN).toISOString());
    set('value', svc.typical);
    set('bookedBy', 'ai');
    set('bookedAt', new Date(now).toISOString());
    out.events.push({ kind: 'dispatch', text: 'Emergency visit on the way' });
    say('Thanks. ' + owner + ' is heading your way now and will call when close, usually within 45 minutes.' + (L.service === 'gas' ? ' Stay outside until then.' : ' Keep the water off until then.'));
    return out;
  }

  function book() {
    const svc = serviceOf(settings, L.service);
    set('status', 'booked');
    set('value', svc.typical);
    set('bookedBy', 'ai');
    set('bookedAt', new Date(now).toISOString());
    set('needsCall', false);
    const first = String(L.name).split(' ')[0];
    out.events.push({ kind: 'booked', text: svc.name + ', ' + slotLabel(L.slot, now) });
    say("You're booked in, " + first + '! ' + svc.name + ' ' + slotLabel(L.slot, now) + ' in ' + L.zip + ". We'll text you when we're on the way. Reply here if anything changes.");
    return out;
  }
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function suggestions(lead, now) {
  if (!lead) return [];
  const st = stageOf(lead);
  if (lead.status === 'opted_out') return ['START'];
  if (st === 'issue') return ['Kitchen drain is blocked', 'Pipe burst, water everywhere!', 'No hot water since this morning', 'How much do you charge?'];
  if (st === 'zip') return lead.urgent ? ['78704', '1402 Maple St, 78745'] : ['78704', '78745', '78610'];
  if (st === 'slot') {
    const opts = (lead.offered || []).map(i => cap(slotLabel(i, now)) + ' works');
    return [...opts.slice(0, 3), 'None of those work'];
  }
  if (st === 'name') return ['Sam Carter', 'Priya Patel'];
  if (lead.status === 'booked') return ['Thank you!', 'Can I change the time?', 'Are you licensed?'];
  return [];
}
