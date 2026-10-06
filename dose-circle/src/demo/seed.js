import { DEFAULT_SETTINGS, MIN, HOUR, DAY, SLOTS, setZone, dayStart, addDays, atTime, slotAt, shortTime } from './engine.js';
import { emptyState, newDose, slotMeds, sendDose, sendNudge, escalate, inbound, addReading, refillSweep, ensureDoses, personById, memberById, medById, uid } from './care.js';

const iso = t => new Date(t).toISOString();

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PEOPLE = [
  {
    id: 'p1', name: 'Rosa Delgado', age: 78, phone: '+18135550111', pronouns: { they: 'she', them: 'her', their: 'her' },
    schedule: { morning: '08:00', midday: '13:00', evening: '18:00', bedtime: '21:30' }, tracks: ['bp', 'glucose'],
    doctor: 'Dr. Priya Raman', pharmacy: 'Bayview Pharmacy', conditions: ['Type 2 diabetes', 'High blood pressure', 'Underactive thyroid'], hue: 336,
    lives: 'Lives alone in Tampa'
  },
  {
    id: 'p2', name: 'Tomás Delgado', age: 81, phone: '+18135550112', pronouns: { they: 'he', them: 'him', their: 'his' },
    schedule: { morning: '07:30', evening: '19:00', bedtime: '21:30' }, tracks: ['weight', 'bp'],
    doctor: 'Dr. Marcus Lin', pharmacy: 'Bayview Pharmacy', conditions: ['Heart failure', 'Atrial fibrillation', 'Enlarged prostate'], hue: 204,
    lives: 'Lives with Rosa'
  }
];

export const CIRCLE = [
  { id: 'm1', name: 'Ana Delgado', relation: 'Daughter', role: 'primary', phone: '+18135550122', email: 'ana@example.com', careFor: ['p1', 'p2'], calls: { p1: 'Mom', p2: 'Dad' }, alerts: true, digest: true, hue: 262, note: '20 minutes away' },
  { id: 'm2', name: 'Marco Delgado', relation: 'Son', role: 'backup', phone: '+16465550133', email: 'marco@example.com', careFor: ['p1', 'p2'], calls: { p1: 'Mom', p2: 'Dad' }, alerts: true, digest: true, hue: 28, note: 'Lives in New York' },
  { id: 'm3', name: 'June Whitaker', relation: 'Neighbor', role: 'backup', phone: '+18135550144', email: '', careFor: ['p1', 'p2'], calls: { p1: 'Rosa', p2: 'Tomás' }, alerts: true, digest: false, hue: 150, note: 'Next door, has a spare key' }
];

export const MEDS = [
  { id: 'k1', personId: 'p1', name: 'Levothyroxine', strength: '75 mcg', form: 'tablet', pill: { color: 'violet', shape: 'round', size: 'small' }, purpose: 'thyroid', doses: { morning: 1 }, withFood: false, note: 'With water, before breakfast', supply: 41, refillQty: 90, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Priya Raman' },
  { id: 'k2', personId: 'p1', name: 'Lisinopril', strength: '10 mg', form: 'tablet', pill: { color: 'pink', shape: 'round' }, purpose: 'blood pressure', doses: { morning: 1 }, withFood: false, note: '', supply: 24, refillQty: 30, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Priya Raman' },
  { id: 'k3', personId: 'p1', name: 'Metformin', strength: '500 mg', form: 'tablet', pill: { color: 'white', shape: 'oval', size: 'large' }, purpose: 'blood sugar', doses: { midday: 1, evening: 1 }, withFood: true, note: 'Swallow whole', supply: 64, refillQty: 60, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Priya Raman' },
  { id: 'k4', personId: 'p1', name: 'Vitamin D3', strength: '1000 IU', form: 'softgel', pill: { color: 'yellow', shape: 'softgel' }, purpose: 'vitamin', doses: { midday: 1 }, withFood: true, note: '', supply: 88, refillQty: 100, pharmacy: 'Bayview Pharmacy', prescriber: '' },
  { id: 'k5', personId: 'p1', name: 'Aspirin', strength: '81 mg', form: 'tablet', pill: { color: 'orange', shape: 'round', size: 'small' }, purpose: 'heart protection', doses: { evening: 1 }, withFood: true, note: '', supply: 52, refillQty: 120, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Priya Raman' },
  { id: 'k6', personId: 'p1', name: 'Atorvastatin', strength: '20 mg', form: 'tablet', pill: { color: 'white', shape: 'oval', size: 'small' }, purpose: 'cholesterol', doses: { bedtime: 1 }, withFood: false, note: '', supply: 23, refillQty: 30, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Priya Raman' },
  { id: 'k7', personId: 'p2', name: 'Furosemide', strength: '20 mg', form: 'tablet', pill: { color: 'white', shape: 'round', size: 'small' }, purpose: 'fluid build-up', doses: { morning: 1 }, withFood: false, note: 'Weigh first, then take', supply: 26, refillQty: 30, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Marcus Lin' },
  { id: 'k8', personId: 'p2', name: 'Metoprolol', strength: '25 mg', form: 'tablet', pill: { color: 'peach', shape: 'round' }, purpose: 'heart rate', doses: { morning: 1, evening: 1 }, withFood: true, note: '', supply: 47, refillQty: 60, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Marcus Lin' },
  { id: 'k9', personId: 'p2', name: 'Apixaban', strength: '5 mg', form: 'tablet', pill: { color: 'pink', shape: 'oval' }, purpose: 'blood thinner', doses: { morning: 1, evening: 1 }, withFood: false, note: 'Never skip without asking Dr. Lin', supply: 12, refillQty: 60, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Marcus Lin' },
  { id: 'k10', personId: 'p2', name: 'Tamsulosin', strength: '0.4 mg', form: 'capsule', pill: { color: 'orange', color2: 'green', shape: 'capsule' }, purpose: 'prostate', doses: { bedtime: 1 }, withFood: false, note: '30 minutes after supper', supply: 33, refillQty: 30, pharmacy: 'Bayview Pharmacy', prescriber: 'Dr. Marcus Lin' }
];

const SUPPLY = Object.fromEntries(MEDS.map(m => [m.id, m.supply]));

const pick = (r, list) => list[Math.floor(r() * list.length)];
const jitter = (r, a, b) => a + r() * (b - a);

const SCRIPT = {
  'p2:-9:morning': { reply: 'took em. weight 186.9', delay: 6 },
  'p2:-9:morning:ack': { member: 'm1', text: 'Thanks, calling Dr. Lin’s office now', delay: 14 },
  'p1:-6:morning': { reply: 'Took them. BP 168/98 this morning', delay: 9 },
  'p1:-6:morning:ack': { member: 'm1', text: 'On it, I’ll call her after work', delay: 22 },
  'p1:-5:bedtime': { silent: true },
  'p2:-4:evening': { family: true },
  'p1:-3:midday': { reply: 'Took them but not the big white one, it upsets my stomach', delay: 11 },
  'p1:-2:morning': { reply: 'done. sugar was 64, feeling a bit shaky', delay: 7 },
  'p1:-2:morning:ack': { member: 'm1', text: 'Calling her now', delay: 5 },
  'p2:-1:morning': { late: 'sorry was in the shower, took them', delay: 34 },
  'p2:-1:evening': { reply: 'taken. my ankles look a bit puffy tonight', delay: 12 },
  'p1:-1:bedtime': { snooze: 'in 20 minutes, watching my show', delay: 4, then: 'taken, goodnight' }
};

export function buildDemo(now = Date.now(), settings = DEFAULT_SETTINGS) {
  const S = { ...DEFAULT_SETTINGS, ...settings };
  setZone(S.timezone);
  const s = emptyState(S);
  const r = rng(20261006);
  s.people = PEOPLE.map(p => ({ ...p, schedule: { ...p.schedule }, optedOut: false, aiPaused: false, paused: false, pending: null, lastReplyAt: null, unread: false }));
  s.circle = CIRCLE.map(m => ({ ...m, careFor: [...m.careFor], calls: { ...m.calls }, optedOut: false, unread: false, lastReplyAt: null }));
  s.meds = MEDS.map(m => ({ ...m, pill: { ...m.pill }, doses: { ...m.doses }, active: true, startedAt: iso(addDays(dayStart(now), -200 - Math.floor(r() * 400))) }));
  s.seq = 40;
  const today = dayStart(now);
  const WINDOW = -9;

  const weight = k => Math.round((182.1 + (k + 30) * 0.05 + (k === -9 ? 3.6 : k === -8 ? 2.4 : k === -7 ? 1.1 : 0) + (k >= -1 ? 1.1 : 0) + jitter(r, -0.6, 0.6)) * 10) / 10;
  const bp = (k, base = 132) => (k === -6 ? [168, 98] : [Math.round(base + jitter(r, -9, 10)), Math.round(81 + jitter(r, -6, 6))]);
  const sugar = k => (k === -2 ? 64 : Math.round(121 + jitter(r, -20, 24)));

  const reply = (person, phone, text, at) => inbound(s, phone, text, at, [1800, 1400]);

  for (let k = -30; k <= 0; k++) {
    const day = addDays(today, k);
    const plan = [];
    for (const p of s.people) {
      for (const slot of SLOTS) {
        const meds = slotMeds(s, p, slot.key);
        if (!meds.length) continue;
        const due = slotAt(p, slot.key, day);
        if (due > now) continue;
        plan.push({ p, slot: slot.key, due, meds });
      }
    }
    plan.sort((a, b) => a.due - b.due);
    for (const x of plan) {
      const { p, slot, due } = x;
      const d = newDose(s, p, slot, due, x.meds);
      s.doses.push(d);
      const key = p.id + ':' + k + ':' + slot;
      const sc = SCRIPT[key];
      const evening = slot === 'evening' || slot === 'bedtime';
      const roll = r();
      const missP = p.id === 'p2' ? (evening ? 0.11 : 0.04) : 0.025;
      const lateP = p.id === 'p2' ? (evening ? 0.2 : 0.1) : 0.1;
      const readMorning = slot === 'morning' && (r() < (p.id === 'p1' ? 0.86 : 0.8) || k >= -1);
      let text = pick(r, p.id === 'p1' ? ['Took them, thank you', 'Taken ✅', 'done', 'Yes taken', 'took them dear', 'All taken', 'Done 👍', 'yes'] : ['ok', 'taken', 'took em', 'Done', 'yep taken', 'ok done']);
      if (readMorning) {
        if (p.id === 'p1') {
          const [a, b] = bp(k);
          text = pick(r, ['Took them. BP ' + a + '/' + b + ', sugar ' + sugar(k), 'done. bp ' + a + '/' + b + ' sugar was ' + sugar(k), 'Taken ✅ ' + a + '/' + b + ' this morning, sugar ' + sugar(k)]);
        } else text = pick(r, ['taken. weight ' + weight(k), 'took em, ' + weight(k) + ' lbs', 'Done. Weighed ' + weight(k)]);
      } else if (p.id === 'p2' && slot === 'evening' && r() < 0.35) {
        const [a, b] = bp(k, 124);
        text = 'taken, bp ' + a + '/' + b;
      }

      if (k < WINDOW) {
        if (readMorning) {
          if (p.id === 'p1') {
            const [a, b] = bp(k);
            addReading(s, p, { type: 'bp', sys: a, dia: b }, due + 6 * MIN, 'text');
            addReading(s, p, { type: 'glucose', value: sugar(k) }, due + 6 * MIN, 'text');
          } else addReading(s, p, { type: 'weight', value: weight(k) }, due + 6 * MIN, 'text');
        }
        d.remindedAt = iso(due);
        if (roll < missP) {
          d.status = 'missed';
          d.resolvedAt = iso(due + 180 * MIN);
        } else if (roll < missP + 0.015 && x.meds.length > 1) {
          d.status = 'partial';
          d.missed = [x.meds[0].medId];
          d.takenAt = iso(due + 9 * MIN);
          d.via = 'text';
        } else {
          d.status = 'taken';
          d.via = 'text';
          d.takenAt = iso(due + (roll < missP + lateP ? jitter(r, 24, 44) : jitter(r, 2, 16)) * MIN);
          if (roll < 0.04) d.nudgedAt = iso(due + 20 * MIN);
        }
        d.resolvedAt = d.resolvedAt || d.takenAt;
        continue;
      }

      const elapsed = now - due;
      if (k === 0 && elapsed < 40 * MIN) {
        sendDose(s, d, due);
        if (elapsed >= S.nudgeMinutes * MIN) sendNudge(s, d, due + S.nudgeMinutes * MIN);
        continue;
      }
      sendDose(s, d, due);
      const at = m => Math.min(now - 30000, due + m * MIN);
      if (sc && sc.silent) {
        sendNudge(s, d, due + S.nudgeMinutes * MIN);
        escalate(s, d, due + S.escalateMinutes * MIN, 'primary');
        d.status = 'missed';
        d.resolvedAt = iso(due + S.missAfterMinutes * MIN);
        continue;
      }
      if (sc && sc.family) {
        sendNudge(s, d, due + S.nudgeMinutes * MIN);
        escalate(s, d, due + S.escalateMinutes * MIN, 'primary');
        escalate(s, d, due + S.backupMinutes * MIN, 'backup');
        const marco = memberById(s, 'm2');
        inbound(s, marco.phone, 'On it, calling Dad now', due + (S.backupMinutes + 6) * MIN);
        inbound(s, marco.phone, 'He fell asleep in his chair. He took them now, all good', due + (S.backupMinutes + 24) * MIN);
        continue;
      }
      if (sc && sc.snooze) {
        reply(p, p.phone, sc.snooze, due + sc.delay * MIN);
        const until = Date.parse(d.snoozeUntil);
        d.snoozeSent = true;
        s.messages.push({ id: uid(s, 'm'), thread: p.id, dir: 'out', author: 'ai', kind: 'dose', body: 'It’s ' + shortTime(until) + ' now, Rosa. Time for those bedtime pills. Reply TAKEN when you’ve had them.', at: iso(until), doseId: d.id, alertId: null, intent: null });
        reply(p, p.phone, sc.then, until + 3 * MIN);
        continue;
      }
      if (sc && sc.late) {
        sendNudge(s, d, due + S.nudgeMinutes * MIN);
        reply(p, p.phone, sc.late, at(sc.delay));
        continue;
      }
      if (sc && sc.reply) {
        reply(p, p.phone, sc.reply, at(sc.delay));
        const ack = SCRIPT[key + ':ack'];
        if (ack) {
          const m = memberById(s, ack.member);
          inbound(s, m.phone, ack.text, at(sc.delay + ack.delay));
        }
        continue;
      }
      if (roll < missP && k < 0 && slot !== 'bedtime') {
        sendNudge(s, d, due + S.nudgeMinutes * MIN);
        escalate(s, d, due + S.escalateMinutes * MIN, 'primary');
        const ana = memberById(s, 'm1');
        inbound(s, ana.phone, pick(r, ['On it', 'Calling now', 'ok checking']), due + (S.escalateMinutes + 4) * MIN);
        inbound(s, ana.phone, pick(r, ['Done, ' + (p.id === 'p1' ? 'she' : 'he') + ' took them', 'All good, ' + (p.id === 'p1' ? 'she' : 'he') + ' had them']), due + (S.escalateMinutes + 17) * MIN);
        continue;
      }
      if (roll < missP + lateP) {
        sendNudge(s, d, due + S.nudgeMinutes * MIN);
        reply(p, p.phone, pick(r, p.id === 'p1' ? ['Sorry, took them now', 'Oh yes! done now', 'Taken, I was on the phone'] : ['ok taken', 'took them now', 'yes done']), at(jitter(r, 24, 38)));
        continue;
      }
      reply(p, p.phone, text, at(jitter(r, 2, 16)));
    }
    if (k < WINDOW && k >= -12) {
      const anchor = atTime(day, 10);
      if (k === -10) {
        s.refills.push({ id: uid(s, 'rf'), medId: 'k2', personId: 'p1', status: 'picked', at: iso(anchor), daysLeft: 5, source: 'count', orderedAt: iso(anchor + 3 * HOUR), pickedAt: iso(addDays(anchor, 1) + 7 * HOUR), by: 'm1', alertId: null });
      }
    }
    if (k === -2) {
      const ana = memberById(s, 'm1');
      const t = atTime(day, 20, 15);
      if (t < now) inbound(s, ana.phone, 'Status?', t);
    }
  }

  for (const m of s.meds) m.supply = SUPPLY[m.id];
  const sweepAt = now >= atTime(today, S.refillHour) ? atTime(today, S.refillHour) : atTime(addDays(today, -1), S.refillHour);
  refillSweep(s, sweepAt);
  s.marks.refillDay = dayStart(sweepAt);

  for (const a of s.alerts) {
    const age = now - Date.parse(a.at);
    const keep = a.kind === 'refill' || (a.kind === 'symptom' && age < 30 * HOUR);
    if (!a.ackAt && !keep) {
      a.ackAt = iso(Date.parse(a.at) + 12 * MIN);
      a.ackBy = 'm1';
    }
    if (!a.resolvedAt && !keep && age > 6 * HOUR) {
      a.resolvedAt = iso(Date.parse(a.at) + 40 * MIN);
      a.resolution = a.resolution || 'handled';
    }
  }
  for (const p of s.people) p.unread = false;
  for (const m of s.circle) m.unread = false;
  ensureDoses(s, now);
  s.messages.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return s;
}
