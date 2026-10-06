import { buildDemo } from './seed.js';
import {
  publicState, inbound, tick, newDose, slotMeds, sendDose, sendNudge, resolveDose, personById, memberById, medById, doseById, alertById, familyText, note, createRefill
} from './care.js';
import { DEFAULT_SETTINGS, MIN, SLOTS, parts, dayStart, slotAt, daysLeft } from './engine.js';
import { SCENARIOS } from './scenarios.js';

let state = null;

const ensure = () => state || (state = buildDemo(Date.now()));
const clone = o => JSON.parse(JSON.stringify(o));
const iso = t => new Date(t).toISOString();
const NUMBERS = ['nudgeMinutes', 'escalateMinutes', 'backupMinutes', 'missAfterMinutes', 'quietStart', 'quietEnd', 'refillDays', 'refillHour', 'digestDay', 'digestHour', 'bpHighSys', 'bpHighDia', 'bpLowSys', 'glucoseHigh', 'glucoseLow', 'weightGainDay', 'weightGainWeek'];

export async function demoFetch() {
  const s = ensure();
  const now = Date.now();
  tick(s, now);
  return clone(publicState(s, now));
}

const casual = (m, plural) => {
  const p = m.pill || {};
  const size = p.size === 'large' ? 'big ' : p.size === 'small' ? 'little ' : '';
  return 'the ' + size + (p.color || '') + (plural ? ' ones' : ' one');
};

const minuteOfDay = t => {
  const p = parts(t);
  return p.h * 60 + p.mi;
};

export function startScenario(s, key, now) {
  const sc = SCENARIOS.find(x => x.key === key) || SCENARIOS[0];
  const S = s.settings;
  const p = s.people[0];
  const member = memberById(s, S.viewer) || s.circle[0];
  const rich = SLOTS.filter(x => slotMeds(s, p, x.key).length >= 2);
  const pool = rich.length ? rich : SLOTS.filter(x => slotMeds(s, p, x.key).length);
  if (!pool.length) throw new Error(p.name + ' has no medicines scheduled');
  const nowM = minuteOfDay(now);
  const slot = pool.slice().sort((a, b) => Math.abs(minuteOfDay(slotAt(p, a.key, now)) - nowM) - Math.abs(minuteOfDay(slotAt(p, b.key, now)) - nowM))[0];
  const day = dayStart(now);
  let d = s.doses.find(x => x.personId === p.id && x.slot === slot.key && dayStart(Date.parse(x.due)) === day);
  if (d && (d.status === 'taken' || d.status === 'partial')) {
    for (const x of d.meds) {
      if (d.missed.includes(x.medId)) continue;
      const m = medById(s, x.medId);
      if (m) m.supply += x.count;
    }
  }
  const fresh = newDose(s, p, slot.key, now, slotMeds(s, p, slot.key));
  if (d) Object.assign(d, { ...fresh, id: d.id });
  else {
    d = fresh;
    s.doses.push(d);
  }
  d.demo = true;
  s.alerts = s.alerts.filter(a => a.doseId !== d.id);
  s.messages = s.messages.filter(m => m.doseId !== d.id);
  for (const x of s.doses) {
    if (x.personId === p.id && x.id !== d.id && x.status === 'due') {
      x.status = 'taken';
      x.via = 'text';
      x.takenAt = iso(now - 60000);
      x.resolvedAt = x.takenAt;
    }
  }
  p.pending = null;
  p.optedOut = false;
  p.aiPaused = false;
  member.optedOut = false;
  const meds = d.meds.map(x => medById(s, x.medId)).filter(Boolean);
  const skipMed = meds.find(m => m.name === 'Metformin') || meds[meds.length - 1];
  const lowMed = meds.find(m => m.name === 'Metformin') || meds[0];
  if (key === 'low') {
    for (const r of s.refills) if (r.medId === lowMed.id && r.status !== 'picked') r.status = 'picked';
    lowMed.supply = Math.max(lowMed.supply, 40);
  }
  if (key === 'quiet') {
    const due = now - S.escalateMinutes * MIN + 5200;
    d.due = iso(due);
    sendDose(s, d, due);
    sendNudge(s, d, due + S.nudgeMinutes * MIN);
  } else {
    d.due = iso(now + 1400);
    sendDose(s, d, now + 1400);
  }
  const steps = (sc.steps || []).map(st => ({ ...st, text: st.text.replace('{skip}', casual(skipMed)).replace('{low}', casual(lowMed, true)) }));
  return { personId: p.id, memberId: member.id, phone: p.phone, memberPhone: member.phone, doseId: d.id, slot: slot.key, steps, since: Date.parse(d.due) - 60000 };
}

export function runAction(s, action, q, now) {
  const S = s.settings;
  const person = q.person ? personById(s, q.person) : null;
  const member = q.member ? memberById(s, q.member) : null;
  const dose = q.dose ? doseById(s, q.dose) : null;
  const med = q.med ? medById(s, q.med) : null;
  const alert = q.alert ? alertById(s, q.alert) : null;
  if (q.person && !person) throw new Error('That person no longer exists');
  if (q.member && !member) throw new Error('That family member no longer exists');
  if (q.dose && !dose) throw new Error('That dose no longer exists');
  if (q.med && !med) throw new Error('That medicine no longer exists');
  if (q.alert && !alert) throw new Error('That alert no longer exists');
  const viewer = S.viewer;

  if (action === 'start') return { ok: true, ...startScenario(s, q.scenario, now) };
  if (action === 'send') {
    familyText(s, String(q.thread || ''), String(q.body || '').slice(0, 480), now, viewer);
    return { ok: true };
  }
  if (action === 'read') {
    const t = personById(s, q.thread) || memberById(s, q.thread);
    if (t) t.unread = false;
    return { ok: true };
  }
  if (action === 'pause') {
    person.aiPaused = String(q.paused) === 'true';
    note(s, person.id, person.aiPaused ? 'Automatic replies paused by the family' : 'Automatic replies back on', now);
    return { ok: true };
  }
  if (action === 'ack') {
    alert.ackAt = iso(now);
    alert.ackBy = viewer;
    return { ok: true };
  }
  if (action === 'resolve') {
    if (!alert.ackAt) {
      alert.ackAt = iso(now);
      alert.ackBy = viewer;
    }
    alert.resolvedAt = iso(now);
    alert.resolution = 'handled in the app';
    return { ok: true };
  }
  if (action === 'mark') {
    if (!['taken', 'skipped'].includes(q.status)) throw new Error('Unknown dose status');
    if (dose.status !== 'due' && dose.status !== 'scheduled' && dose.status !== 'missed') throw new Error('That dose is already settled');
    if (dose.status === 'scheduled') dose.status = 'due';
    resolveDose(s, dose, q.status, now, 'family', viewer, q.status === 'skipped' ? dose.meds.map(x => x.medId) : [], q.status === 'skipped' ? 'Marked by the family' : '');
    return { ok: true };
  }
  if (action === 'remind') {
    if (dose.status === 'scheduled') dose.due = iso(now);
    sendDose(s, dose, now, 'family');
    return { ok: true };
  }
  if (action === 'refill') {
    const r = s.refills.find(x => x.id === q.refill);
    if (!r) throw new Error('That refill no longer exists');
    const m = medById(s, r.medId);
    const a = alertById(s, r.alertId);
    if (q.status === 'ordered') {
      r.status = 'ordered';
      r.orderedAt = iso(now);
      r.by = viewer;
      if (a && !a.ackAt) {
        a.ackAt = iso(now);
        a.ackBy = viewer;
      }
    } else if (q.status === 'picked') {
      r.status = 'picked';
      r.pickedAt = iso(now);
      r.by = viewer;
      m.supply = Number(m.supply || 0) + Number(m.refillQty || 30);
      if (a) {
        a.ackAt = a.ackAt || iso(now);
        a.ackBy = a.ackBy || viewer;
        a.resolvedAt = iso(now);
        a.resolution = 'picked up';
      }
    } else throw new Error('Unknown refill status');
    return { ok: true };
  }
  if (action === 'request-refill') {
    const r = createRefill(s, med, now, 'family');
    if (!r) throw new Error('A refill for ' + med.name + ' is already in progress');
    return { ok: true };
  }
  if (action === 'supply') {
    const n = Math.round(Number(q.count));
    if (!Number.isFinite(n) || n < 0 || n > 2000) throw new Error('Enter a pill count between 0 and 2000');
    med.supply = n;
    return { ok: true, daysLeft: daysLeft(med) };
  }
  if (action === 'med-active') {
    med.active = String(q.active) === 'true';
    return { ok: true };
  }
  if (action === 'schedule') {
    if (!/^[0-2][0-9]:[0-5][0-9]$/.test(String(q.time || ''))) throw new Error('Use a time like 08:30');
    if (!SLOTS.some(x => x.key === q.slot)) throw new Error('Unknown time of day');
    person.schedule = { ...person.schedule, [q.slot]: q.time };
    const day = dayStart(now);
    for (const d of s.doses) {
      if (d.personId !== person.id || d.slot !== q.slot || d.status !== 'scheduled') continue;
      d.due = iso(slotAt(person, q.slot, Date.parse(d.due) >= day ? Date.parse(d.due) : day));
    }
    return { ok: true };
  }
  if (action === 'member') {
    for (const k of ['alerts', 'digest']) if (k in q) member[k] = String(q[k]) === 'true';
    if (q.role && ['primary', 'backup'].includes(q.role)) member.role = q.role;
    return { ok: true };
  }
  if (action === 'settings') {
    const next = { ...s.settings };
    for (const [k, v] of Object.entries(q)) {
      if (!(k in DEFAULT_SETTINGS) || k === 'viewer') continue;
      if (NUMBERS.includes(k)) next[k] = Number(v);
      else if (typeof DEFAULT_SETTINGS[k] === 'boolean') next[k] = String(v) === 'true';
      else next[k] = String(v);
    }
    s.settings = next;
    return { ok: true };
  }
  throw new Error('Unknown action ' + action);
}

export async function demoAction(action, p = {}) {
  const s = ensure();
  const now = Date.now();
  tick(s, now);
  if (action === 'sms') {
    const res = inbound(s, String(p.phone || ''), String(p.body || '').slice(0, 480), now);
    return { ok: true, intent: res.intent };
  }
  if (action === 'reset') {
    state = buildDemo(now, s.settings);
    return { ok: true };
  }
  return runAction(s, action, p, now);
}
