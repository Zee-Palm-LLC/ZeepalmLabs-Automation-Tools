import { DAY, MIN, DEFAULT_SETTINGS, stageOf, timeLabel, freeSlots, isOpen } from './engine.js';
import { emptyState, missedCall, answeredCall, inbound, followUp, ownerBook } from './desk.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Sam', 'Priya', 'Marcus', 'Elena', 'Jordan', 'Aisha', 'Tom', 'Grace', 'Luis', 'Hannah', 'Derek', 'Mei', 'Carlos', 'Olivia', 'Ben', 'Fatima', 'Ryan', 'Chloe', 'Andre', 'Nina', 'Kevin', 'Sofia', 'Jake', 'Lauren', 'Omar', 'Tessa', 'Victor', 'Rachel', 'Miles', 'Jasmine', 'Brandon', 'Leah', 'Hector', 'Ivy', 'Noah', 'Maya'];
const LAST = ['Carter', 'Patel', 'Nguyen', 'Brooks', 'Reyes', 'Kim', 'Walsh', 'Hughes', 'Ortiz', 'Bennett', 'Shah', 'Foster', 'Delgado', 'Price', 'Coleman', 'Wright', 'Park', 'Morales', 'Hayes', 'Lin', 'Grant', 'Okafor'];
const ZIPS = ['78704', '78745', '78702', '78703', '78731', '78757', '78613', '78664', '78681', '78759', '78723', '78741', '78749', '78727'];
const FAR = ['78610', '78640', '78666', '78620'];

const LINES = {
  drain: ['Kitchen sink is completely blocked and won\'t drain', 'Shower drain is backing up and smells bad', 'Hi, our main drain seems clogged, the toilets are gurgling', 'Bathtub drains really slowly, think it\'s clogged', 'Garbage disposal jammed and the sink is blocked'],
  leakEmergency: ['Pipe just burst under the kitchen sink, water everywhere!!', 'Water is coming through the ceiling from the upstairs bathroom', 'Hot water pipe burst in the garage, it\'s pouring out', 'Toilet overflowing and won\'t stop, water all over the floor'],
  leak: ['Pipe in the crawl space is leaking slowly', 'Found a leak behind the washing machine', 'Small leak on the pipe under the bathroom sink'],
  heater: ['No hot water since this morning. Water heater is 12 years old', 'Need a quote to replace our water heater', 'Water heater is making a loud banging noise', 'Tankless water heater keeps showing an error code'],
  heating: ['Furnace stopped working, house is freezing', 'No heat upstairs, the radiators are cold'],
  toilet: ['Toilet keeps running all night', 'Toilet is rocking and leaking at the base', 'Upstairs toilet won\'t flush properly'],
  faucet: ['Kitchen faucet dripping nonstop', 'Bathroom sink tap is loose and dripping', 'Outdoor spigot is broken'],
  install: ['Looking for a quote to install a new walk-in shower', 'Can you install a new kitchen faucet and garbage disposal?', 'We\'re remodeling a bathroom and need a plumber for the rough-in'],
  gas: ['I can smell gas near the water heater']
};

const CATS = [['drain', 24], ['leakEmergency', 8], ['leak', 7], ['heater', 15], ['heating', 6], ['toilet', 12], ['faucet', 12], ['install', 10], ['gas', 1]];
const OUTCOMES = [['book', 45], ['no_reply', 23], ['late', 5], ['lost', 11], ['far', 5], ['call', 8], ['opt', 3]];

export function buildDemo(now = Date.now(), settings = DEFAULT_SETTINGS) {
  const rnd = mulberry32(90210);
  const r = (a, b) => a + rnd() * (b - a);
  const ri = (a, b) => Math.floor(r(a, b + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const weighted = list => {
    const total = list.reduce((a, x) => a + x[1], 0);
    let x = rnd() * total;
    for (const [k, w] of list) {
      x -= w;
      if (x < 0) return k;
    }
    return list[0][0];
  };

  const s = emptyState(settings);
  const phones = [];
  for (const area of ['512', '737']) for (let i = 0; i < 100; i++) phones.push('+1' + area + '55501' + String(i).padStart(2, '0'));
  const pool = phones.filter(p => !['+15125550100', '+15125550123'].includes(p));
  const people = [];
  for (let i = 0; i < 120; i++) people.push({ phone: pool.splice(Math.floor(rnd() * pool.length), 1)[0], first: pick(FIRST), last: pick(LAST) });

  const say = (lead, text, at) => inbound(s, lead.phone, text, at, [ri(4, 9) * 1000, 2200]);

  function converse(person, callAt, cat, outcome, stopAt) {
    const { call, lead } = missedCall(s, person.phone, callAt, ri(3, 7));
    if (!call.textBackSeconds) return lead;
    let t = callAt + call.textBackSeconds * 1000;
    const end = Math.min(stopAt, now);
    const issue = pick(LINES[cat]);
    if (outcome === 'no_reply' || outcome === 'late') {
      const f1 = t + (Number(settings.followUpMinutes) || 30) * MIN;
      if (f1 > end) return lead;
      if (outcome === 'late') {
        t = f1 + ri(8, 90) * MIN;
        if (t > end) {
          followUp(s, lead, 1, f1);
          return lead;
        }
        followUp(s, lead, 1, f1);
      } else {
        followUp(s, lead, 1, f1);
        const f2 = t + (Number(settings.finalFollowUpHours) || 20) * 3600000;
        if (f2 <= end) followUp(s, lead, 2, f2);
        return lead;
      }
    } else {
      t += (rnd() < 0.7 ? r(0.6, 5) : r(5, 16)) * MIN;
    }
    const script = [];
    let turns = 0;
    let said = null;
    while (turns < 9) {
      if (t > end) break;
      const st = stageOf(lead);
      let line = null;
      if (turns === 0) line = issue;
      else if (outcome === 'call' && turns === 1) line = pick(['Can someone just call me? Easier to explain', 'Could Dan give me a call?', 'Can I talk to someone?']);
      else if (outcome === 'lost' && turns === 1) line = pick(['Thanks, but I already found someone', 'All good now, we fixed it ourselves', 'Never mind, went with someone else']);
      else if (outcome === 'opt' && turns === 1) line = 'STOP';
      else if (st === 'zip') line = lead.urgent ? pick([pick(ZIPS), ri(100, 9900) + ' ' + pick(['Maple St', 'Oak Hollow Dr', 'Barton Hills Dr', 'Cedar Ln', 'Riverside Dr']) + ', ' + pick(ZIPS)]) : outcome === 'far' ? pick(FAR) : pick([pick(ZIPS), "It's " + pick(ZIPS), pick(ZIPS) + ' thanks']);
      else if (st === 'slot') {
        const o = lead.offered || [];
        const later = new Date(t + ri(2, 5) * DAY);
        if (later.getDay() === 0) later.setDate(later.getDate() + 1);
        const dayName = later.toLocaleDateString('en-US', { weekday: 'long' });
        line = rnd() < 0.4 ? pick(['Anything on ' + dayName + '?', dayName + ' would be better', 'Could you do ' + dayName + ' afternoon?']) : pick(['The first one works', '2 please', 'Earliest please', o[1] ? timeLabel(o[1]) + ' works' : 'The first one works', 'Afternoon if possible', 'Tomorrow morning is best']);
        if (said === 'slot') line = pick(['The first one works', '2 please', 'The first one works']);
      } else if (st === 'name') line = pick([person.first + ' ' + person.last, "It's " + person.first + ' ' + person.last, person.first + ' ' + person.last + ' please']);
      else if (lead.status === 'booked' && turns < 6 && rnd() < 0.35 && said !== 'thanks') {
        line = pick(['Thank you!', 'Perfect, thanks', 'Great, thank you so much', 'Are you licensed?']);
        said = 'thanks';
        say(lead, line, t);
        break;
      }
      if (!line) break;
      said = st;
      script.push(line);
      say(lead, line, t);
      turns += 1;
      t += (turns === 1 ? r(0.4, 3) : r(0.3, 2.5)) * MIN;
      if (['lost', 'opted_out'].includes(lead.status)) break;
      if (outcome === 'call' && lead.needsCall) break;
    }
    if (outcome === 'call' && lead.needsCall) {
      const back = t + ri(12, 55) * MIN;
      if (back < end - 20 * MIN) {
        const slot = freeSlots(s.settings, s.leads.filter(x => x.id !== lead.id), back, 1)[0];
        if (slot) ownerBook(s, lead, slot, back);
        if (!lead.service) {
          lead.service = 'other';
          lead.issue = 'General plumbing';
          lead.value = 240;
        }
        lead.name = lead.name || person.first + ' ' + person.last;
      }
    }
    if (lead.urgent && now - Date.parse(lead.createdAt) > 2 * 3600000) lead.ack = true;
    if (lead.status === 'chatting' && now - Date.parse(lead.lastAt) > 26 * 3600000) lead.status = 'no_reply';
    return lead;
  }

  const days = 30;
  const today = new Date(now);
  const cutoff = now - 6.5 * 3600000;
  let lastPerson = null;
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    const wd = day.getDay();
    const n = wd === 0 ? ri(1, 2) : wd === 6 ? ri(3, 5) : ri(6, 10);
    const times = [];
    for (let i = 0; i < n; i++) {
      const hour = rnd() < 0.12 ? pick([6, 19, 20, 21]) : r(7.2, 18);
      times.push(day.getTime() + hour * 3600000 + ri(0, 59) * 1000);
    }
    times.sort((a, b) => a - b);
    for (const at of times) {
      if (at > cutoff) continue;
      const person = lastPerson && rnd() < 0.06 ? lastPerson : pick(people);
      lastPerson = person;
      const h = new Date(at).getHours();
      const open = isOpen(s.settings, at);
      const missProb = !open ? 1 : h >= 10 && h < 15 ? 0.42 : 0.24;
      if (rnd() >= missProb) {
        answeredCall(s, person.phone, at, ri(50, 420));
        continue;
      }
      const cat = open ? weighted(CATS) : weighted([['leakEmergency', 16], ['drain', 24], ['heater', 22], ['toilet', 16], ['heating', 10], ['faucet', 10], ['gas', 2]]);
      const outcome = weighted(OUTCOMES);
      converse(person, at, cat, outcome, Infinity);
    }
  }

  const fresh = people.filter(p => !s.leads.some(l => l.phone === p.phone));
  converse(fresh[0], now - 6 * 3600000 + 5 * MIN, 'heater', 'book', Infinity);
  const scripted = (person, callAt, lines) => {
    const { lead } = missedCall(s, person.phone, callAt, 4);
    for (const [min, text] of lines) say(lead, text, callAt + min * MIN);
    return lead;
  };
  scripted(fresh[1], now - 150 * MIN, [[1.2, 'Pipe just burst under the kitchen sink, water everywhere!!'], [2.6, '1402 Maple St, 78704']]);
  scripted(fresh[2], now - 48 * MIN, [[2.1, 'Water heater is leaking from the bottom'], [4.3, 'Can someone just call me? Easier to explain']]);
  scripted(fresh[3], now - 19 * MIN, [[1.5, 'Toilet keeps running all night'], [3.1, '78745']]);
  scripted(fresh[4], now - 4 * MIN, []);
  return s;
}
