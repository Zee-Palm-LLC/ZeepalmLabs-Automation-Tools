import {
  DEFAULT_SETTINGS, MIN, HOUR, DAY, NL, SLOTS, fill, firstName, slotOf, slotAt, dayStart, addDays, hourOf, shortTime, dayLabel, dateLabel,
  perDay, daysLeft, pillPhrase, medLabel, readCare, readFamily, matchMeds, readingLabel, READING_NAME, phoneLabel
} from './engine.js';

const iso = t => new Date(t).toISOString();

export function emptyState(settings = DEFAULT_SETTINGS) {
  return { settings: { ...settings }, people: [], circle: [], meds: [], doses: [], readings: [], alerts: [], refills: [], messages: [], queue: [], marks: {}, seq: 0 };
}

export const uid = (s, p) => p + (++s.seq).toString(36);

export function addMessage(s, m) {
  const msg = { id: uid(s, 'm'), doseId: null, alertId: null, intent: null, kind: 'text', ...m };
  s.messages.push(msg);
  return msg;
}

export function note(s, thread, body, at, extra = {}) {
  return addMessage(s, { thread, dir: 'note', author: 'system', body, at: iso(at), ...extra });
}

export const personById = (s, id) => s.people.find(p => p.id === id);
export const memberById = (s, id) => s.circle.find(m => m.id === id);
export const medById = (s, id) => s.meds.find(m => m.id === id);
export const doseById = (s, id) => s.doses.find(d => d.id === id);
export const alertById = (s, id) => s.alerts.find(a => a.id === id);
export const medsOf = (s, pid) => s.meds.filter(m => m.personId === pid && m.active !== false);
export const pron = p => p.pronouns || { they: 'they', them: 'them', their: 'their' };
export const cap = t => String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);

export function membersFor(s, personId, role) {
  return s.circle.filter(m => (m.careFor || []).includes(personId) && (!role || m.role === role) && m.alerts !== false && !m.optedOut);
}

export const callsFor = (m, p) => (m && m.calls && m.calls[p.id]) || firstName(p.name);

export function joinNames(list) {
  const n = list.map(x => firstName(x.name || x));
  if (n.length <= 1) return n.join('');
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}

export function isQuiet(s, t) {
  const h = hourOf(t);
  const S = s.settings;
  return S.quietStart > S.quietEnd ? h >= S.quietStart || h < S.quietEnd : h >= S.quietStart && h < S.quietEnd;
}

export const quietFor = (s, t, d) => !(d && d.demo) && isQuiet(s, t);
const slotWord = d => slotOf(d.slot).word;
const doseTime = d => shortTime(d.due);
const medNames = (s, ids) => joinNames(ids.map(id => medById(s, id)).filter(Boolean).map(m => m.name));

export function newDose(s, p, slot, due, meds) {
  return {
    id: uid(s, 'd'), personId: p.id, slot, due: iso(due), meds, status: 'scheduled', remindedAt: null, nudgedAt: null, snoozeUntil: null, snoozeSent: false,
    alerted: { primary: null, backup: null }, held: false, takenAt: null, via: null, by: null, missed: [], reason: '', reply: null
  };
}

export function slotMeds(s, p, slot) {
  return medsOf(s, p.id).filter(m => Number((m.doses || {})[slot] || 0) > 0).map(m => ({ medId: m.id, count: Number(m.doses[slot]) }));
}

export function ensureDoses(s, now) {
  const today = dayStart(now);
  for (const p of s.people) {
    if (p.paused) continue;
    for (const k of [0, 1]) {
      const day = addDays(today, k);
      for (const slot of SLOTS) {
        const list = slotMeds(s, p, slot.key);
        if (!list.length) continue;
        if (s.doses.some(d => d.personId === p.id && d.slot === slot.key && dayStart(Date.parse(d.due)) === day)) continue;
        s.doses.push(newDose(s, p, slot.key, slotAt(p, slot.key, day), list));
      }
    }
  }
}

export function doseList(s, d) {
  return d.meds.map(x => {
    const m = medById(s, x.medId);
    if (!m) return '';
    return '• ' + (x.count > 1 ? x.count + ' × ' : '') + medLabel(m) + ', ' + pillPhrase(m) + (m.withFood ? ' (with food)' : '');
  }).filter(Boolean).join(NL);
}

export function sendDose(s, d, at, author = 'ai') {
  const p = personById(s, d.personId);
  d.status = 'due';
  d.remindedAt = iso(at);
  if (!p || p.optedOut) return null;
  const body = fill(s.settings.templateDose, { first: firstName(p.name), slot: slotWord(d), time: doseTime(d), list: NL + doseList(s, d) + NL });
  return addMessage(s, { thread: p.id, dir: 'out', author, kind: 'dose', body, at: iso(at), doseId: d.id });
}

export function sendNudge(s, d, at) {
  const p = personById(s, d.personId);
  d.nudgedAt = iso(at);
  if (!p || p.optedOut) return null;
  return addMessage(s, { thread: p.id, dir: 'out', author: 'ai', kind: 'nudge', body: fill(s.settings.templateNudge, { first: firstName(p.name), time: doseTime(d), slot: slotWord(d) }), at: iso(at), doseId: d.id });
}

export function addAlert(s, a, at) {
  const alert = { id: uid(s, 'al'), at: iso(at), ackBy: null, ackAt: null, resolvedAt: null, resolution: '', members: [], doseId: null, medId: null, text: '', ...a };
  s.alerts.push(alert);
  return alert;
}

export function escalate(s, d, now, stage) {
  const p = personById(s, d.personId);
  const pr = pron(p);
  const members = membersFor(s, p.id, stage);
  if (!members.length) {
    d.alerted[stage] = iso(now);
    return null;
  }
  if (quietFor(s, now, d)) {
    if (!d.held) {
      d.held = true;
      note(s, p.id, 'Quiet hours, so the family wasn’t texted about the ' + slotWord(d) + ' pills', now, { kind: 'held', doseId: d.id });
    }
    return null;
  }
  const meds = d.meds.map(x => medById(s, x.medId)).filter(Boolean).map(m => m.name).join(', ');
  const primary = membersFor(s, p.id, 'primary');
  const alert = stage === 'primary'
    ? addAlert(s, { personId: p.id, kind: 'missed', level: 'warn', title: firstName(p.name) + ' hasn’t confirmed ' + pr.their + ' ' + slotWord(d) + ' pills', doseId: d.id, members: members.map(m => m.id), stage }, now)
    : s.alerts.find(a => a.doseId === d.id && a.kind === 'missed' && !a.resolvedAt);
  if (alert && stage === 'backup') {
    for (const m of members) if (!alert.members.includes(m.id)) alert.members.push(m.id);
    alert.stage = 'backup';
  }
  members.forEach((m, i) => {
    const name = callsFor(m, p);
    const body = stage === 'primary'
      ? fill(s.settings.templateAlert, { name, their: pr.their, them: pr.them, they: pr.they, time: doseTime(d), slot: slotWord(d), meds })
      : name + ' still hasn’t confirmed ' + pr.their + ' ' + slotWord(d) + ' pills, and ' + joinNames(primary) + ' hasn’t replied yet. Could you check on ' + pr.them + '? Reply DONE if ' + pr.they + ' took them, or ON IT if you’re going.';
    addMessage(s, { thread: m.id, dir: 'out', author: 'ai', kind: 'alert', body, at: iso(now + 400 + i * 300), doseId: d.id, alertId: alert ? alert.id : null });
  });
  d.alerted[stage] = iso(now);
  note(s, p.id, 'No reply yet, so ' + joinNames(members) + (members.length === 1 ? ' was' : ' were') + ' texted', now + 120, { kind: 'escalated', doseId: d.id });
  return alert;
}

export function resolveDose(s, d, status, now, via, by = null, missed = [], reason = '') {
  const was = d.status;
  d.status = status;
  d.via = via;
  d.by = by;
  d.missed = missed;
  d.reason = reason;
  d.takenAt = status === 'taken' || status === 'partial' ? iso(now) : null;
  d.resolvedAt = iso(now);
  if (status === 'taken' || status === 'partial') {
    for (const x of d.meds) {
      if (missed.includes(x.medId)) continue;
      const m = medById(s, x.medId);
      if (m) m.supply = Math.max(0, Number(m.supply || 0) - x.count);
    }
  }
  const told = [];
  for (const a of s.alerts) {
    if (a.doseId !== d.id || a.resolvedAt) continue;
    a.resolvedAt = iso(now);
    a.resolution = status === 'missed' ? 'missed' : via === 'family' ? 'confirmed by family' : status;
    if (a.kind === 'missed') for (const id of a.members) if (id !== by && !told.includes(id)) told.push(id);
  }
  const p = personById(s, d.personId);
  if (was === 'due' && status !== 'missed' && told.length && p) {
    const pr = pron(p);
    told.forEach((id, i) => {
      const m = memberById(s, id);
      if (!m) return;
      const who = via === 'family' && by ? firstName((memberById(s, by) || {}).name) + ' says ' + callsFor(m, p) + ' took ' + pr.their : 'All good: ' + callsFor(m, p) + ' just took ' + pr.their;
      addMessage(s, { thread: m.id, dir: 'out', author: 'ai', kind: 'resolved', body: who + ' ' + slotWord(d) + ' pills' + (via === 'family' ? '. No need to check.' : ' (' + shortTime(now) + ').'), at: iso(now + 2600 + i * 300), doseId: d.id });
    });
  }
  return d;
}

export function openDose(s, p, now) {
  return s.doses
    .filter(d => d.personId === p.id && d.status === 'due' && Date.parse(d.due) <= now + 5000)
    .sort((a, b) => Date.parse(b.due) - Date.parse(a.due))[0] || null;
}

function upcomingDose(s, p, now, within) {
  return s.doses
    .filter(d => d.personId === p.id && d.status === 'scheduled' && Date.parse(d.due) > now && Date.parse(d.due) - now <= within)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0] || null;
}

export function nextDose(s, p, now) {
  return s.doses
    .filter(d => d.personId === p.id && d.status === 'scheduled' && Date.parse(d.due) > now)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0] || null;
}

function nextLabel(s, p, now) {
  const n = nextDose(s, p, now);
  if (!n) return 'not scheduled yet';
  const day = dayLabel(n.due, now);
  return (day === 'today' ? 'at ' : day + ' at ') + doseTime(n);
}

export function addReading(s, p, rd, now, via = 'text') {
  const S = s.settings;
  const r = { id: uid(s, 'r'), personId: p.id, type: rd.type, sys: rd.sys || null, dia: rd.dia || null, pulse: rd.pulse || null, value: rd.value != null ? rd.value : null, at: iso(now), via, flag: null, note: '' };
  if (r.type === 'bp') {
    if (r.sys >= S.bpHighSys || r.dia >= S.bpHighDia) {
      r.flag = 'high';
      r.note = 'Above ' + S.bpHighSys + '/' + S.bpHighDia;
    } else if (r.sys < S.bpLowSys) {
      r.flag = 'low';
      r.note = 'Below ' + S.bpLowSys + ' top number';
    }
  }
  if (r.type === 'glucose') {
    if (r.value >= S.glucoseHigh) {
      r.flag = 'high';
      r.note = 'Above ' + S.glucoseHigh;
    } else if (r.value <= S.glucoseLow) {
      r.flag = 'low';
      r.note = 'Below ' + S.glucoseLow;
    }
  }
  if (r.type === 'weight') {
    const prior = s.readings.filter(x => x.personId === p.id && x.type === 'weight' && Date.parse(x.at) < now).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const day = prior.find(x => now - Date.parse(x.at) >= 12 * HOUR && now - Date.parse(x.at) <= 40 * HOUR);
    const week = prior.find(x => now - Date.parse(x.at) >= 6 * DAY && now - Date.parse(x.at) <= 8 * DAY);
    if (day && r.value - day.value >= S.weightGainDay) {
      r.flag = 'gain';
      r.note = 'Up ' + Math.round((r.value - day.value) * 10) / 10 + ' lb since yesterday';
    } else if (week && r.value - week.value >= S.weightGainWeek) {
      r.flag = 'gain';
      r.note = 'Up ' + Math.round((r.value - week.value) * 10) / 10 + ' lb in a week';
    }
  }
  s.readings.push(r);
  return r;
}

export const openRefill = (s, medId) => s.refills.find(r => r.medId === medId && r.status !== 'picked');

export function createRefill(s, med, now, source, out) {
  if (openRefill(s, med.id)) return null;
  const p = personById(s, med.personId);
  const left = daysLeft(med);
  const refill = { id: uid(s, 'rf'), medId: med.id, personId: p.id, status: 'needed', at: iso(now), daysLeft: left, source, orderedAt: null, pickedAt: null, by: null };
  s.refills.push(refill);
  const members = membersFor(s, p.id, 'primary');
  const alert = addAlert(s, { personId: p.id, kind: 'refill', level: 'info', title: medLabel(med) + (left <= 0 ? ' has run out' : ' runs out in ' + left + (left === 1 ? ' day' : ' days')), medId: med.id, members: members.map(m => m.id), refillId: refill.id }, now);
  refill.alertId = alert.id;
  for (const m of members) {
    const name = callsFor(m, p);
    const body = left <= 0
      ? name + ' has run out of ' + medLabel(med) + ' (' + pillPhrase(med) + '). Reply ORDERED once you’ve asked ' + med.pharmacy + ', or PICKED UP when it’s home.'
      : fill(s.settings.templateRefill, { name, med: medLabel(med) + ' (' + pillPhrase(med) + ')', days: left + (left === 1 ? ' day' : ' days'), date: dateLabel(now + left * DAY), pharmacy: med.pharmacy });
    if (out) out.push({ to: m.id, body, kind: 'refill', alertId: alert.id });
    else addMessage(s, { thread: m.id, dir: 'out', author: 'ai', kind: 'refill', body, at: iso(now + 500), alertId: alert.id });
  }
  return refill;
}

export function refillSweep(s, now) {
  const made = [];
  for (const m of s.meds) {
    if (m.active === false) continue;
    if (daysLeft(m) <= s.settings.refillDays) {
      const r = createRefill(s, m, now, 'count');
      if (r) made.push(r);
    }
  }
  return made;
}

export function doseTick(s, now) {
  const S = s.settings;
  ensureDoses(s, now);
  const done = { reminders: 0, nudges: 0, alerts: 0, missed: 0 };
  const urgent = new Set(s.alerts.filter(a => a.kind === 'emergency' && !a.resolvedAt).map(a => a.personId));
  for (const d of s.doses) {
    if (d.status !== 'scheduled' && d.status !== 'due') continue;
    if (d.status === 'due' && urgent.has(d.personId)) continue;
    const due = Date.parse(d.due);
    if (d.status === 'scheduled') {
      if (now < due) continue;
      if (now - due > S.missAfterMinutes * MIN) {
        d.status = 'missed';
        d.resolvedAt = iso(now);
        continue;
      }
      sendDose(s, d, now);
      done.reminders += 1;
      continue;
    }
    const snooze = d.snoozeUntil ? Date.parse(d.snoozeUntil) : 0;
    if (snooze && !d.snoozeSent && now >= snooze) {
      const p = personById(s, d.personId);
      d.snoozeSent = true;
      d.nudgedAt = null;
      if (p && !p.optedOut) addMessage(s, { thread: p.id, dir: 'out', author: 'ai', kind: 'dose', body: 'It’s ' + shortTime(now) + ' now, ' + firstName(p.name) + '. Time for those ' + slotWord(d) + ' pills. Reply TAKEN when you’ve had them.', at: iso(now), doseId: d.id });
      done.reminders += 1;
      continue;
    }
    if (snooze && now < snooze) continue;
    const base = Math.max(due, snooze);
    if (now - due >= S.missAfterMinutes * MIN && (!snooze || now - snooze >= S.missAfterMinutes * MIN / 2)) {
      d.status = 'missed';
      d.resolvedAt = iso(now);
      note(s, d.personId, cap(slotWord(d)) + ' pills were never confirmed. Marked as missed.', now, { kind: 'missed', doseId: d.id });
      for (const a of s.alerts) if (a.doseId === d.id && !a.resolvedAt) a.resolution = 'missed';
      done.missed += 1;
      continue;
    }
    if (!d.nudgedAt && now >= base + S.nudgeMinutes * MIN) {
      sendNudge(s, d, now);
      done.nudges += 1;
      continue;
    }
    if (!d.alerted.primary && now >= base + S.escalateMinutes * MIN) {
      if (escalate(s, d, now, 'primary')) done.alerts += 1;
      continue;
    }
    const alert = s.alerts.find(a => a.doseId === d.id && a.kind === 'missed' && !a.resolvedAt);
    if (d.alerted.primary && !d.alerted.backup && alert && !alert.ackAt && now >= base + S.backupMinutes * MIN) {
      if (escalate(s, d, now, 'backup')) done.alerts += 1;
    }
  }
  return done;
}

export function tick(s, now) {
  const due = s.queue.filter(q => q.at <= now).sort((a, b) => a.at - b.at);
  if (due.length) s.queue = s.queue.filter(q => q.at > now);
  for (const q of due) inbound(s, q.phone, q.body, q.at);
  doseTick(s, now);
  const today = dayStart(now);
  if (hourOf(now) >= s.settings.refillHour && s.marks.refillDay !== today) {
    s.marks.refillDay = today;
    refillSweep(s, now);
  }
}

export function whoByPhone(s, phone) {
  const p = s.people.find(x => x.phone === phone);
  if (p) return { kind: 'person', who: p };
  const m = s.circle.find(x => x.phone === phone);
  if (m) return { kind: 'member', who: m };
  return null;
}

export function inbound(s, phone, body, now, delays = [2200, 1500], hint = null) {
  const found = whoByPhone(s, phone);
  if (!found) return { who: null, intent: 'unknown' };
  const { who, kind } = found;
  const msg = addMessage(s, { thread: who.id, dir: 'in', author: kind, body, at: iso(now) });
  who.lastReplyAt = iso(now);
  who.unread = true;
  if (!s.settings.aiEnabled || who.aiPaused) {
    note(s, who.id, who.aiPaused ? 'Automatic replies are paused for ' + firstName(who.name) + '.' : 'Automatic replies are off.', now + 200);
    return { who, kind, intent: 'paused', msg };
  }
  const out = kind === 'person' ? respondPerson(s, who, body, now, msg, hint) : respondMember(s, who, body, now, msg, hint);
  let t = now;
  out.forEach((r, i) => {
    t += delays[Math.min(i, delays.length - 1)];
    addMessage(s, { thread: r.to, dir: 'out', author: 'ai', kind: r.kind || 'reply', body: r.body, at: iso(t), doseId: r.doseId || null, alertId: r.alertId || null });
  });
  return { who, kind, intent: msg.intent, msg };
}

function schedulePhrase(m) {
  const words = { morning: 'in the morning', midday: 'at lunchtime', evening: 'in the evening', bedtime: 'at bedtime' };
  return SLOTS.filter(x => Number((m.doses || {})[x.key] || 0) > 0).map(x => m.doses[x.key] + ' ' + words[x.key]).join(' and ');
}

export function mergeHint(r, hint, s, doseMeds, allMeds) {
  if (!hint || typeof hint !== 'object') return r;
  if (r.stop || r.start || r.concern === 'emergency' || r.concern === 'double') return r;
  const out = { ...r };
  const ids = (names, pool) => {
    const got = [];
    for (const n of names || []) for (const id of matchMeds(String(n), pool)) if (!got.includes(id)) got.push(id);
    return got;
  };
  if (['taken', 'partial', 'skipped', 'later'].includes(hint.dose)) out.dose = hint.dose;
  if (hint.dose === 'none') out.dose = null;
  if (Array.isArray(hint.missed)) out.missed = ids(hint.missed, doseMeds);
  if (out.dose === 'partial' && !out.missed.length) out.dose = 'taken';
  if (Number.isFinite(hint.later_minutes)) out.laterMinutes = Math.max(5, Math.min(240, Math.round(hint.later_minutes)));
  if (out.dose === 'later' && !out.laterMinutes) out.laterMinutes = 30;
  if (typeof hint.reason === 'string') out.reason = hint.reason.slice(0, 120);
  if (Array.isArray(hint.readings) && !r.readings.length) {
    out.readings = hint.readings.filter(x => x && (x.type === 'bp' ? x.sys > x.dia : Number.isFinite(x.value))).map(x => ({ type: x.type, sys: x.sys, dia: x.dia, pulse: x.pulse || null, value: x.value }));
  }
  if (Array.isArray(hint.low) && !r.low.length) out.low = hint.low.map(x => ({ medId: ids([x.med], allMeds)[0] || null, count: Number.isFinite(x.count) ? x.count : null }));
  if (hint.concern === 'symptom' && !r.concern) out.concern = 'symptom';
  if (hint.concern === 'emergency') out.concern = 'emergency';
  out.question = !!hint.question && !out.dose;
  out.advice = r.advice || !!hint.advice;
  out.callback = r.callback || !!hint.callback;
  out.thanks = r.thanks || !!hint.thanks;
  return out;
}

export function intentOf(r) {
  if (r.stop) return 'stop';
  if (r.start) return 'start';
  if (r.concern === 'emergency') return 'emergency';
  if (r.concern === 'double') return 'double';
  if (r.dose === 'partial') return 'partial';
  if (r.dose === 'skipped') return 'skipped';
  if (r.dose === 'later') return 'later';
  if (r.concern === 'symptom') return 'symptom';
  if (r.low.length) return 'low';
  if (r.readings.length && !r.dose) return 'reading';
  if (r.dose === 'taken') return 'taken';
  if (r.callback) return 'callback';
  if (r.question) return 'question';
  if (r.thanks) return 'thanks';
  return 'other';
}

export function respondPerson(s, p, body, now, msg, hint) {
  const S = s.settings;
  const pr = pron(p);
  const first = firstName(p.name);
  const all = medsOf(s, p.id);
  const dose = openDose(s, p, now);
  const doseMeds = dose ? dose.meds.map(x => medById(s, x.medId)).filter(Boolean) : all;
  let r = readCare(body, doseMeds);
  r.low = readCare(body, all).low;
  r = mergeHint(r, hint, s, doseMeds, all);
  msg.intent = intentOf(r);
  msg.doseId = dose ? dose.id : null;
  const out = [];
  const say = t => out.push({ to: p.id, body: t, doseId: dose ? dose.id : null });
  const tell = (members, make, extra = {}) => members.forEach(m => out.push({ to: m.id, body: make(m, callsFor(m, p)), kind: 'alert', ...extra }));
  const primary = membersFor(s, p.id, 'primary');
  const everyone = membersFor(s, p.id);
  const prim = joinNames(primary) || 'your family';
  const quote = '“' + String(body).trim() + '”';

  if (r.stop) {
    p.optedOut = true;
    say('You won’t get any more texts from Dose Circle. Reply START to turn them back on.');
    note(s, p.id, first + ' turned off texts', now + 100);
    return out;
  }
  if (r.start) {
    p.optedOut = false;
    say('Welcome back, ' + first + '. Your pill reminders are on again.');
    return out;
  }

  if (r.concern === 'emergency') {
    const alert = addAlert(s, { personId: p.id, kind: 'emergency', level: 'urgent', title: first + (r.fall ? ' may have fallen' : ' may need help right now'), text: body, members: everyone.map(m => m.id) }, now);
    say(r.fall
      ? 'I’m texting ' + joinNames(everyone) + ' right now so someone checks on you, ' + first + '. If you’re hurt or can’t get up, call 911.'
      : first + ', if you have chest pain, trouble breathing or feel like you might pass out, call 911 now. I’m texting ' + joinNames(everyone) + ' right now.');
    tell(everyone, (m, name) => 'URGENT: ' + name + ' just texted ' + quote + '. Please call ' + pr.them + ' now at ' + phoneLabel(p.phone) + '. If you can’t reach ' + pr.them + ', call 911. Reply ON IT so the others know.', { alertId: alert.id });
    note(s, p.id, 'Urgent alert sent to everyone in the circle. No medical advice was given.', now + 150, { kind: 'urgent', alertId: alert.id });
    return out;
  }

  if (r.concern === 'double') {
    const alert = addAlert(s, { personId: p.id, kind: 'double', level: 'urgent', title: first + ' may have taken an extra dose', text: body, members: primary.map(m => m.id), doseId: dose ? dose.id : null }, now);
    if (dose) resolveDose(s, dose, 'taken', now, 'text');
    say('Thanks for telling me, ' + first + '. I can’t give medical advice, so please call Poison Control at ' + S.poisonControl + ' now. It’s free, open day and night, and they’ll tell you exactly what to do. I’ve let ' + prim + ' know.');
    tell(primary, (m, name) => name + ' says ' + pr.they + ' may have taken an extra dose: ' + quote + '. I asked ' + pr.them + ' to call Poison Control at ' + S.poisonControl + '. Please check in with ' + pr.them + '.', { alertId: alert.id });
    return out;
  }

  const parts = [];
  if (r.dose && dose) {
    const word = slotWord(dose);
    if (r.dose === 'taken') {
      resolveDose(s, dose, 'taken', now, 'text');
      parts.push('Thanks, ' + first + '. Your ' + word + ' pills are marked as taken.');
    } else if (r.dose === 'partial') {
      resolveDose(s, dose, 'partial', now, 'text', null, r.missed, r.reason);
      const names = medNames(s, r.missed);
      parts.push('Thanks, ' + first + '. I’ve marked your ' + word + ' pills as taken, except ' + names + '.' + (r.reason ? ' I’ve noted what you said for your doctor and let ' + prim + ' know.' : ' I’ve let ' + prim + ' know.'));
      const alert = addAlert(s, { personId: p.id, kind: 'partial', level: 'info', title: first + ' skipped ' + names + ' at ' + word, text: body, doseId: dose.id, members: primary.map(m => m.id) }, now);
      if (!quietFor(s, now, dose)) tell(primary, (m, name) => 'FYI: ' + name + ' took ' + pr.their + ' ' + word + ' pills except ' + names + '. ' + cap(pr.they) + ' said ' + quote + '. I’ve noted it for ' + pr.their + ' doctor.', { alertId: alert.id, kind: 'fyi' });
    } else if (r.dose === 'skipped') {
      resolveDose(s, dose, 'skipped', now, 'text', null, dose.meds.map(x => x.medId), r.reason);
      parts.push('Okay, ' + first + '. I’ve noted that you’re skipping your ' + word + ' pills and let ' + prim + ' know.');
      const alert = addAlert(s, { personId: p.id, kind: 'partial', level: 'info', title: first + ' skipped ' + pr.their + ' ' + slotWord(dose) + ' pills', text: body, doseId: dose.id, members: primary.map(m => m.id) }, now);
      if (!quietFor(s, now, dose)) tell(primary, (m, name) => 'FYI: ' + name + ' is skipping ' + pr.their + ' ' + word + ' pills. ' + cap(pr.they) + ' said ' + quote + '.', { alertId: alert.id, kind: 'fyi' });
    } else if (r.dose === 'later') {
      const until = now + (r.laterMinutes || 30) * MIN;
      dose.snoozeUntil = iso(until);
      dose.snoozeSent = false;
      dose.nudgedAt = null;
      parts.push('No problem, ' + first + '. I’ll remind you again at ' + shortTime(until) + '.');
      note(s, p.id, 'Asked to be reminded at ' + shortTime(until), now + 100, { kind: 'snooze', doseId: dose.id });
    }
  } else if (r.dose === 'taken') {
    const early = upcomingDose(s, p, now, 90 * MIN);
    if (early) {
      resolveDose(s, early, 'taken', now, 'text');
      parts.push('Thanks, ' + first + '. I’ve marked your ' + slotWord(early) + ' pills as taken a little early.');
    } else parts.push('Thanks, ' + first + '. You’re all caught up. Your next pills are ' + nextLabel(s, p, now) + '.');
  } else if (r.dose === 'later' || r.dose === 'partial' || r.dose === 'skipped') {
    parts.push('Thanks, ' + first + '. Nothing is due right now. Your next pills are ' + nextLabel(s, p, now) + '.');
  }

  if (r.readings.length) {
    const saved = r.readings.map(x => addReading(s, p, x, now, 'text'));
    parts.push(saved.map((x, i) => (i ? READING_NAME[x.type].toLowerCase() : READING_NAME[x.type]) + ' ' + readingLabel(x)).join(' and ') + (saved.length === 1 ? ' is' : ' are') + ' logged.');
    const flagged = saved.filter(x => x.flag);
    if (flagged.length) {
      const x = flagged[0];
      const alert = addAlert(s, { personId: p.id, kind: 'reading', level: 'warn', title: READING_NAME[x.type] + ' ' + readingLabel(x) + ' is ' + (x.flag === 'gain' ? 'a quick gain' : x.flag === 'low' ? 'low' : 'high'), text: x.note, readingId: x.id, members: primary.map(m => m.id) }, now);
      parts.push('That’s outside the range your family set, so I’ve let ' + prim + ' know. If you feel very unwell, call 911.');
      tell(primary, (m, name) => 'Heads up: ' + name + '’s ' + READING_NAME[x.type].toLowerCase() + ' just now was ' + readingLabel(x) + '. ' + x.note + ', outside the range you set.' + (r.concern === 'symptom' ? '' : ' ' + cap(pr.they) + ' didn’t mention feeling unwell.'), { alertId: alert.id });
    }
  }

  const low = r.low.length ? r.low : p.pending && p.pending.kind === 'which-low' ? matchMeds(body, all).map(id => ({ medId: id, count: null })) : [];
  if (low.length) {
    p.pending = null;
    const known = low.filter(l => l.medId);
    if (!known.length) {
      p.pending = { kind: 'which-low' };
      parts.push('Which medicine is running low? Tell me the name or what the pill looks like.');
    } else {
      const named = [];
      for (const l of known) {
        const med = medById(s, l.medId);
        if (!med) continue;
        if (l.count != null) med.supply = l.count;
        const open = openRefill(s, med.id);
        if (open) named.push(med.name + ' is already on ' + prim + '’s list');
        else {
          createRefill(s, med, now, 'reported', out);
          named.push(med.name);
        }
      }
      const fresh = named.filter(x => !/on .* list/.test(x));
      if (fresh.length) parts.push('I’ve told ' + prim + ' your ' + joinNames(fresh) + ' is running low so a refill gets sorted.');
      const old = named.filter(x => /on .* list/.test(x));
      if (old.length) parts.push(old.join('. ') + '.');
    }
  }

  if (r.concern === 'symptom' && r.dose !== 'partial' && r.dose !== 'skipped') {
    const alert = addAlert(s, { personId: p.id, kind: 'symptom', level: 'warn', title: first + ' isn’t feeling well', text: body, members: primary.map(m => m.id) }, now);
    parts.push((parts.length ? 'I’m sorry you’re not feeling well. ' : 'I’m sorry you’re not feeling well, ' + first + '. ') + 'I can’t give medical advice, but I’ve let ' + prim + ' know and noted it for your doctor. If it gets worse, call 911.');
    tell(primary, (m, name) => name + ' says ' + quote + '. ' + cap(pr.they) + ' may want a call. I’ve noted it for ' + pr.their + ' doctor.', { alertId: alert.id });
  }

  if (r.question || (r.advice && !parts.length)) {
    const ids = matchMeds(body, all);
    if (r.advice) {
      const alert = addAlert(s, { personId: p.id, kind: 'question', level: 'info', title: first + ' asked a medicine question', text: body, members: primary.map(m => m.id) }, now);
      parts.push('That’s a good question for your pharmacist or doctor, ' + first + '. I can’t give medical advice, so I’ve passed it to ' + prim + ' too.');
      tell(primary, (m, name) => name + ' asked: ' + quote + '. I told ' + pr.them + ' to check with the pharmacist.', { alertId: alert.id, kind: 'fyi' });
    } else if (ids.length === 1) {
      const m = medById(s, ids[0]);
      parts.push(cap(pillPhrase(m)) + ' is ' + medLabel(m) + ', for ' + m.purpose + '. You take ' + schedulePhrase(m) + (m.withFood ? ', with food' : '') + '.');
    } else if (/(when|what time|next)/i.test(body)) {
      parts.push('Your next pills are ' + nextLabel(s, p, now) + '.');
    } else {
      const alert = addAlert(s, { personId: p.id, kind: 'question', level: 'info', title: first + ' asked a question', text: body, members: primary.map(m => m.id) }, now);
      parts.push('I’m not sure about that one, so I’ve passed your question to ' + prim + '.');
      tell(primary, (m, name) => name + ' asked: ' + quote, { alertId: alert.id, kind: 'fyi' });
    }
  }

  if (r.callback) {
    const alert = addAlert(s, { personId: p.id, kind: 'callback', level: 'info', title: first + ' would like a call', text: body, members: primary.map(m => m.id) }, now);
    parts.push('I’ve asked ' + prim + ' to give you a call.');
    tell(primary, (m, name) => name + ' would like a call: ' + quote, { alertId: alert.id });
  }

  if (!parts.length && r.thanks) parts.push('You’re welcome, ' + first + '.');
  if (!parts.length) parts.push('Sorry, ' + first + ', I didn’t catch that. Reply TAKEN when you’ve had your pills, or tell me what’s going on. ' + prim + ' can see these messages too.');
  out.unshift({ to: p.id, body: parts.join(' '), doseId: dose ? dose.id : null });
  return out;
}

export function statusLine(s, p, now, name) {
  const today = dayStart(now);
  const doses = s.doses.filter(d => d.personId === p.id && dayStart(Date.parse(d.due)) === today);
  const due = doses.filter(d => Date.parse(d.due) <= now);
  const taken = due.filter(d => d.status === 'taken' || d.status === 'partial');
  const waiting = due.find(d => d.status === 'due');
  const next = nextDose(s, p, now);
  const reading = s.readings.filter(r => r.personId === p.id && Date.parse(r.at) >= today).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  let line = name + ': ' + taken.length + ' of ' + due.length + ' doses taken so far today';
  if (waiting) line += ', ' + slotWord(waiting) + ' pills still waiting for a reply';
  if (next && dayStart(Date.parse(next.due)) === today) line += ', next at ' + doseTime(next);
  line += '.';
  if (reading) line += ' ' + READING_NAME[reading.type] + ' ' + readingLabel(reading) + ' at ' + shortTime(reading.at) + '.';
  return line;
}

export function respondMember(s, m, body, now, msg, hint) {
  const first = firstName(m.name);
  const rule = readFamily(body);
  const intent = rule === 'stop' || rule === 'start' ? rule : hint && ['ack', 'done', 'ordered', 'picked', 'status', 'other'].includes(hint) ? hint : rule;
  msg.intent = intent;
  const out = [];
  const say = t => out.push({ to: m.id, body: t });
  if (intent === 'stop') {
    m.optedOut = true;
    say('You won’t get Dose Circle alerts any more. Reply START to turn them back on.');
    return out;
  }
  if (intent === 'start') {
    m.optedOut = false;
    say('Alerts are back on, ' + first + '.');
    return out;
  }
  const open = s.alerts
    .filter(a => a.members.includes(m.id) && !a.resolvedAt && now - Date.parse(a.at) < DAY)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const mine = open.filter(a => !a.ackAt);
  const ack = a => {
    a.ackAt = iso(now);
    a.ackBy = m.id;
  };

  if (intent === 'done') {
    const a = open.find(x => x.doseId && doseById(s, x.doseId) && doseById(s, x.doseId).status === 'due');
    if (a) {
      const d = doseById(s, a.doseId);
      const p = personById(s, d.personId);
      if (!a.ackAt) ack(a);
      resolveDose(s, d, 'taken', now, 'family', m.id);
      msg.doseId = d.id;
      say('Thanks, ' + first + '. ' + callsFor(m, p) + '’s ' + slotWord(d) + ' pills are marked as taken.');
      return out;
    }
    if (mine[0]) {
      ack(mine[0]);
      mine[0].resolvedAt = iso(now);
      mine[0].resolution = 'handled by ' + first;
      say('Thanks, ' + first + '. I’ve marked it as handled.');
      return out;
    }
    say('Thanks, ' + first + '. Nothing is waiting on you right now.');
    return out;
  }

  if (intent === 'ack') {
    const a = mine[0];
    if (!a) {
      say('Thanks, ' + first + '.');
      return out;
    }
    ack(a);
    const p = personById(s, a.personId);
    const others = a.members.filter(id => id !== m.id).map(id => memberById(s, id)).filter(Boolean);
    const backups = p ? membersFor(s, p.id, 'backup') : [];
    if (a.kind === 'missed' && others.length === 0 && backups.length) say('Thanks, ' + first + '. I won’t text ' + joinNames(backups) + '. Reply DONE once ' + pron(p).they + '’s taken them.');
    else if (others.length) {
      say('Thanks, ' + first + '. I’ve told ' + joinNames(others) + ' you’re on it.');
      others.forEach(o => out.push({ to: o.id, body: first + ' is on it' + (p ? ' and checking on ' + callsFor(o, p) : '') + '.', kind: 'fyi', alertId: a.id }));
    } else say('Thanks, ' + first + '.');
    return out;
  }

  if (intent === 'ordered' || intent === 'picked') {
    const cares = m.careFor || [];
    const r = s.refills
      .filter(x => cares.includes(x.personId) && (intent === 'ordered' ? x.status === 'needed' : x.status !== 'picked'))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
    if (!r) {
      say('Thanks, ' + first + '. There’s no refill waiting right now.');
      return out;
    }
    const med = medById(s, r.medId);
    const p = personById(s, r.personId);
    const a = alertById(s, r.alertId);
    if (a && !a.ackAt) ack(a);
    if (intent === 'ordered') {
      r.status = 'ordered';
      r.orderedAt = iso(now);
      r.by = m.id;
      say('Great, ' + first + '. ' + callsFor(m, p) + '’s ' + med.name + ' is marked as ordered. Reply PICKED UP when it’s home and I’ll add it to the count.');
    } else {
      r.status = 'picked';
      r.pickedAt = iso(now);
      r.by = m.id;
      med.supply = Number(med.supply || 0) + Number(med.refillQty || 30);
      if (a) {
        a.resolvedAt = iso(now);
        a.resolution = 'picked up';
      }
      say('Thanks, ' + first + '. ' + callsFor(m, p) + ' now has about ' + daysLeft(med) + ' days of ' + med.name + '.');
    }
    return out;
  }

  if (intent === 'status') {
    const lines = (m.careFor || []).map(id => personById(s, id)).filter(Boolean).map(p => statusLine(s, p, now, callsFor(m, p)));
    say(lines.join(NL) || 'Nobody is set up for you yet.');
    return out;
  }

  say('Thanks, ' + first + '. You can reply DONE, ON IT, ORDERED, PICKED UP or STATUS.');
  return out;
}

export function familyText(s, thread, body, now, by) {
  const target = personById(s, thread) || memberById(s, thread);
  if (!target) throw new Error('That conversation no longer exists');
  target.unread = false;
  const from = memberById(s, by);
  return addMessage(s, { thread, dir: 'out', author: 'family', by, kind: 'family', body: (from && personById(s, thread) ? firstName(from.name) + ': ' : '') + body, at: iso(now) });
}

export function adherence(s, personId, from, to) {
  const list = s.doses.filter(d => (!personId || d.personId === personId) && Date.parse(d.due) >= from && Date.parse(d.due) < to && ['taken', 'partial', 'skipped', 'missed'].includes(d.status));
  let score = 0;
  let onTime = 0;
  for (const d of list) {
    if (d.status === 'taken') score += 1;
    if (d.status === 'partial') score += Math.max(0, d.meds.length - d.missed.length) / Math.max(1, d.meds.length);
    if ((d.status === 'taken' || d.status === 'partial') && d.takenAt && Date.parse(d.takenAt) - Date.parse(d.due) <= 30 * MIN) onTime += 1;
  }
  return {
    doses: list.length,
    taken: list.filter(d => d.status === 'taken').length,
    partial: list.filter(d => d.status === 'partial').length,
    skipped: list.filter(d => d.status === 'skipped').length,
    missed: list.filter(d => d.status === 'missed').length,
    pct: list.length ? score / list.length : null,
    onTime: list.length ? onTime / Math.max(1, list.filter(d => d.status === 'taken' || d.status === 'partial').length) : null
  };
}

export function weeklyDigest(s, now) {
  const S = s.settings;
  const from = dayStart(addDays(now, -7));
  const to = dayStart(now);
  const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pct = v => (v == null ? 'n/a' : Math.round(v * 100) + '%');
  const sections = s.people.map(p => {
    const a = adherence(s, p.id, from, to);
    const prev = adherence(s, p.id, addDays(from, -7), from);
    const missed = s.doses.filter(d => d.personId === p.id && Date.parse(d.due) >= from && Date.parse(d.due) < to && (d.status === 'missed' || d.status === 'skipped' || d.status === 'partial'));
    const reads = s.readings.filter(r => r.personId === p.id && Date.parse(r.at) >= from && Date.parse(r.at) < to);
    const flagged = reads.filter(r => r.flag);
    const avg = type => {
      const xs = reads.filter(r => r.type === type);
      if (!xs.length) return null;
      if (type === 'bp') return Math.round(xs.reduce((q, r) => q + r.sys, 0) / xs.length) + '/' + Math.round(xs.reduce((q, r) => q + r.dia, 0) / xs.length);
      return Math.round((xs.reduce((q, r) => q + r.value, 0) / xs.length) * 10) / 10;
    };
    const notes = s.alerts.filter(x => x.personId === p.id && Date.parse(x.at) >= from && Date.parse(x.at) < to && ['symptom', 'partial', 'question', 'emergency', 'double'].includes(x.kind));
    const refills = s.refills.filter(r => r.personId === p.id && r.status !== 'picked').map(r => medById(s, r.medId)).filter(Boolean);
    const cell = 'padding:8px 10px;border-bottom:1px solid #e6e7f0;font-size:14px;vertical-align:top;';
    return '<div style="margin:0 0 26px;padding:18px 20px;border:1px solid #e6e7f0;border-radius:14px;">' +
      '<h3 style="margin:0 0 4px;font-size:18px;">' + esc(p.name) + '</h3>' +
      '<p style="margin:0 0 12px;color:#5d6079;">' + pct(a.pct) + ' of doses taken (' + a.taken + ' of ' + a.doses + ')' + (prev.pct != null && a.pct != null ? ', ' + (a.pct >= prev.pct ? 'up' : 'down') + ' from ' + pct(prev.pct) + ' the week before' : '') + '.</p>' +
      (missed.length ? '<p style="margin:0 0 6px;font-weight:bold;">Missed or skipped</p><table style="border-collapse:collapse;width:100%;">' + missed.map(d => '<tr><td style="' + cell + 'white-space:nowrap;">' + esc(dateLabel(d.due)) + ', ' + esc(shortTime(d.due)) + '</td><td style="' + cell + '">' + esc(d.status === 'partial' ? 'Skipped ' + medNames(s, d.missed) : d.status === 'skipped' ? 'Skipped all' : 'No reply') + (d.reason ? ': &ldquo;' + esc(d.reason) + '&rdquo;' : '') + '</td></tr>').join('') + '</table>' : '<p style="margin:0;color:#1e9e6a;">No missed doses this week.</p>') +
      '<p style="margin:14px 0 6px;font-weight:bold;">Readings</p><p style="margin:0;color:#3b3e57;">' +
      [avg('bp') ? 'Blood pressure averaged ' + avg('bp') : '', avg('glucose') ? 'blood sugar averaged ' + avg('glucose') + ' mg/dL' : '', avg('weight') ? 'weight averaged ' + avg('weight') + ' lb' : ''].filter(Boolean).join(', ') + '. ' +
      (flagged.length ? flagged.length + ' outside your range: ' + flagged.map(r => esc(readingLabel(r)) + ' on ' + esc(dateLabel(r.at))).join(', ') + '.' : 'All inside your range.') + '</p>' +
      (notes.length ? '<p style="margin:14px 0 6px;font-weight:bold;">For the doctor</p><ul style="margin:0;padding-left:18px;">' + notes.map(x => '<li style="margin:4px 0;">' + esc(dateLabel(x.at)) + ': &ldquo;' + esc(x.text) + '&rdquo;</li>').join('') + '</ul>' : '') +
      (refills.length ? '<p style="margin:14px 0 0;color:#3d3bd9;">Refills in progress: ' + esc(refills.map(m => m.name).join(', ')) + '</p>' : '') +
      '</div>';
  }).join('');
  const to_ = s.circle.filter(m => m.digest && m.email && !m.optedOut);
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1b33;max-width:680px;">' +
    '<h2 style="margin:0 0 4px;">' + esc(S.household) + ': the week in pills</h2>' +
    '<p style="margin:0 0 20px;color:#5d6079;">' + esc(dateLabel(from)) + ' to ' + esc(dateLabel(to - DAY)) + '</p>' + sections +
    '<p style="color:#8a8da3;font-size:12px;">Sent by Dose Circle every Sunday. Readings come from what was texted in and are not checked by a clinician.</p></div>';
  return { to: to_.map(m => m.email).join(', '), names: to_.map(m => firstName(m.name)), subject: S.household + ': your weekly update', html };
}

export function publicState(s, now) {
  return {
    settings: s.settings,
    people: s.people,
    circle: s.circle,
    meds: s.meds,
    doses: s.doses,
    readings: s.readings,
    alerts: s.alerts,
    refills: s.refills,
    messages: s.messages,
    queued: s.queue.length,
    serverNow: iso(now)
  };
}
