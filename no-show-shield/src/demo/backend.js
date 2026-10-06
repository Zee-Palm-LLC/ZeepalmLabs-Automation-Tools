import { buildDemo } from './seed.js';
import {
  publicState, inbound, staffMessage, sendReminder, newPatient, uid, patientById, apptById, cancelAppt, confirmByCall, logCall, setOutcome, backfill, tick, note
} from './desk.js';
import { DEFAULT_SETTINGS, MIN, HOUR, DAY, nextWorkday, openSlots, typeOf, atTime, zoned } from './engine.js';
import { SCENARIOS } from './scenarios.js';

let state = null;

const ensure = () => state || (state = buildDemo(Date.now()));
const clone = o => JSON.parse(JSON.stringify(o));
const iso = t => new Date(t).toISOString();
const NUMBERS = ['reminderFirst', 'reminderSecond', 'reminderFinal', 'offerBatch', 'offerMinutes', 'minNoticeHours', 'riskCallList', 'quietStart', 'quietEnd'];

export async function demoFetch() {
  const s = ensure();
  const now = Date.now();
  tick(s, now);
  return clone(publicState(s, now));
}

const freshPhone = s => {
  const used = new Set(s.patients.map(p => p.phone));
  for (let i = 0; i < 100; i++) {
    const cand = '+1737555' + '01' + String(i).padStart(2, '0');
    if (!used.has(cand)) return cand;
  }
  return '+1737555' + String(1000 + Math.floor(Math.random() * 8999));
};

const weekday = t => new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'long' }));

function queueReplies(s, offer, now, lines) {
  offer.candidates.forEach((c, i) => {
    const p = patientById(s, c.patientId);
    if (!p || p.demo || !lines[i]) return;
    s.queue.push({ at: now + lines[i][0], patientId: c.patientId, body: lines[i][1] });
  });
}

function startScenario(s, key, now) {
  const sc = SCENARIOS.find(x => x.key === key) || SCENARIOS[0];
  const S = s.settings;
  const you = newPatient(s, freshPhone(s), now, sc.name);
  you.demo = true;
  you.visits = 3;
  you.noShows = key === 'waitlist' ? 0 : 1;
  you.since = iso(now - 400 * DAY);

  if (key === 'waitlist') {
    const w = { id: uid(s, 'w'), patientId: you.id, type: 'cleaning', provider: 'any', window: 'any', days: null, addedAt: iso(now - 34 * DAY), status: 'waiting', priority: true, note: 'Asked for the first opening', offerId: null, apptId: null };
    s.waitlist.push(w);
    const victim = s.appts
      .filter(a => (a.status === 'booked' || a.status === 'confirmed') && a.provider === 'reyes' && !patientById(s, a.patientId).demo && Date.parse(a.start) > now + 3 * HOUR)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
    if (!victim) throw new Error('No appointment to cancel. Reset the demo data and try again.');
    const vp = patientById(s, victim.patientId);
    inbound(s, vp.phone, 'So sorry, I need to cancel my appointment. Something came up.', now);
    const offer = s.offers.find(o => o.apptId === victim.id && o.status === 'open');
    if (offer) {
      const lines = [[27000, 'Yes please!'], [33000, 'yes']];
      offer.candidates.filter(c => c.patientId !== you.id).forEach((c, i) => {
        if (lines[i]) s.queue.push({ at: now + lines[i][0], patientId: c.patientId, body: lines[i][1] });
      });
    }
    return { patientId: you.id, phone: you.phone, freedId: victim.id, lines: sc.lines || [] };
  }

  const days = [nextWorkday(now, 1), nextWorkday(now, 2), nextWorkday(now, 3), nextWorkday(now, 4)];
  let slot = null;
  for (const d of days) {
    slot = openSlots(s, { minutes: 60, providers: ['reyes'], days: [d], now, limit: 1 })[0];
    if (slot) break;
  }
  if (!slot) slot = { provider: 'reyes', start: iso(atTime(days[0], 12)) };
  const t = typeOf(S, 'cleaning');
  const appt = {
    id: uid(s, 'a'), patientId: you.id, provider: slot.provider, type: 'cleaning', start: slot.start, minutes: t.minutes, value: t.value,
    status: 'booked', bookedAt: iso(now - 38 * DAY), reminders: {}, confirmedAt: null, confirmedBy: null, source: 'phone', replyIntent: null
  };
  s.appts.push(appt);
  sendReminder(s, appt, 'second', now + 1400);

  let lines = sc.lines || [];
  if (key === 'reschedule') {
    const after = Date.parse(slot.start);
    let target = nextWorkday(after, 1);
    for (let i = 1; i <= 8; i++) {
      const d = nextWorkday(after, i);
      const open = openSlots(s, { minutes: 60, providers: ['reyes'], days: [d], from: 13, to: 17, now, limit: 3 });
      if (open.length >= 2) {
        target = d;
        break;
      }
    }
    lines = lines.map(l => l.replace('{day}', weekday(target)));
  }
  return { patientId: you.id, phone: you.phone, apptId: appt.id, lines };
}

export async function demoAction(action, p = {}) {
  const s = ensure();
  const now = Date.now();
  tick(s, now);
  const patient = p.patient ? patientById(s, p.patient) : null;
  const appt = p.appt ? apptById(s, p.appt) : null;
  if (p.patient && !patient) throw new Error('That patient no longer exists');
  if (p.appt && !appt) throw new Error('That appointment no longer exists');

  if (action === 'start') {
    return { ok: true, ...startScenario(s, p.scenario, now) };
  }
  if (action === 'sms') {
    const before = new Set(s.offers.map(o => o.id));
    const res = inbound(s, p.phone, String(p.body || '').slice(0, 480), now);
    for (const o of s.offers) {
      if (before.has(o.id)) continue;
      const freed = apptById(s, o.apptId);
      if (freed && patientById(s, freed.patientId).demo) queueReplies(s, o, Date.parse(o.sentAt), [[6200, 'Yes please!'], [9800, 'yes!']]);
    }
    return { ok: true, patientId: res.patient.id, intent: res.intent };
  }
  if (action === 'send') {
    staffMessage(s, patient, String(p.body || '').slice(0, 480), now);
    return { ok: true };
  }
  if (action === 'read') {
    patient.unread = false;
    return { ok: true };
  }
  if (action === 'pause') {
    patient.aiPaused = String(p.paused) === 'true';
    note(s, patient.id, patient.aiPaused ? 'Front desk took over the conversation' : 'Handed back to the AI', now);
    return { ok: true };
  }
  if (action === 'ack') {
    if (patient.flag) patient.flag.ack = true;
    return { ok: true };
  }
  if (action === 'remind') {
    const kind = p.kind || 'second';
    if (!sendReminder(s, appt, kind, now, 'staff')) throw new Error('This patient has opted out of texts');
    return { ok: true };
  }
  if (action === 'confirm') {
    confirmByCall(s, appt, now);
    return { ok: true };
  }
  if (action === 'call') {
    logCall(s, appt, p.outcome === 'voicemail' ? 'voicemail' : 'no_answer', now);
    return { ok: true };
  }
  if (action === 'outcome') {
    if (!['completed', 'no_show', 'arrived'].includes(p.status)) throw new Error('Unknown outcome');
    setOutcome(s, appt, p.status, now);
    return { ok: true };
  }
  if (action === 'cancel') {
    const offer = cancelAppt(s, appt, now, 'desk');
    return { ok: true, offerId: offer ? offer.id : null };
  }
  if (action === 'offer') {
    const offer = backfill(s, appt, now, true);
    if (!offer) throw new Error('Nobody on the waitlist fits that time');
    return { ok: true, offerId: offer.id };
  }
  if (action === 'waitlist-remove') {
    const w = s.waitlist.find(x => x.id === p.wait);
    if (!w) throw new Error('That waitlist entry no longer exists');
    w.status = 'removed';
    return { ok: true };
  }
  if (action === 'waitlist-priority') {
    const w = s.waitlist.find(x => x.id === p.wait);
    if (!w) throw new Error('That waitlist entry no longer exists');
    w.priority = !w.priority;
    return { ok: true };
  }
  if (action === 'settings') {
    const next = { ...s.settings };
    for (const [k, v] of Object.entries(p)) {
      if (!(k in DEFAULT_SETTINGS)) continue;
      if (k === 'providers' || k === 'types') next[k] = typeof v === 'string' ? JSON.parse(v) : v;
      else if (NUMBERS.includes(k)) next[k] = Number(v);
      else if (k === 'baselineNoShowRate') next[k] = Number(v);
      else if (typeof DEFAULT_SETTINGS[k] === 'boolean') next[k] = String(v) === 'true';
      else next[k] = String(v);
    }
    s.settings = next;
    return { ok: true };
  }
  if (action === 'reset') {
    state = buildDemo(now, s.settings);
    return { ok: true };
  }
  throw new Error('Unknown action ' + action);
}
