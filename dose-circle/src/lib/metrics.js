import { adherence } from '../demo/care.js';
import { DAY, MIN, SLOTS, dayStart, addDays, weekdayOf, daysLeft, perDay } from '../demo/engine.js';

export { adherence };

export const personOf = (data, id) => data.people.find(p => p.id === id);
export const memberOf = (data, id) => data.circle.find(m => m.id === id);
export const medOf = (data, id) => data.meds.find(m => m.id === id);
export const threadOwner = (data, id) => personOf(data, id) || memberOf(data, id);

export function dosesOn(data, pid, day) {
  return data.doses
    .filter(d => d.personId === pid && dayStart(Date.parse(d.due)) === day)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
}

export function today(data, pid, now) {
  const doses = dosesOn(data, pid, dayStart(now));
  const due = doses.filter(d => Date.parse(d.due) <= now || d.status !== 'scheduled');
  const taken = doses.filter(d => d.status === 'taken' || d.status === 'partial');
  const open = doses.filter(d => d.status === 'due');
  const next = data.doses
    .filter(d => d.personId === pid && d.status === 'scheduled' && Date.parse(d.due) > now)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0] || null;
  const readings = data.readings.filter(r => r.personId === pid).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const latest = {};
  for (const r of readings) if (!latest[r.type]) latest[r.type] = r;
  return { doses, due, taken, open, next, latest, missed: doses.filter(d => d.status === 'missed') };
}

export function weekOf(now) {
  const start = dayStart(now);
  const wd = weekdayOf(start);
  const monday = addDays(start, -((wd + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function lastDays(now, n) {
  const start = dayStart(now);
  return Array.from({ length: n }, (_, i) => addDays(start, i - n + 1));
}

export function slotsFor(data, person) {
  return SLOTS.filter(s => data.meds.some(m => m.personId === person.id && m.active !== false && Number((m.doses || {})[s.key] || 0) > 0));
}

export function supply(data) {
  return data.meds
    .filter(m => m.active !== false)
    .map(m => ({ med: m, days: daysLeft(m), perDay: perDay(m), refill: data.refills.find(r => r.medId === m.id && r.status !== 'picked') || null }))
    .sort((a, b) => a.days - b.days);
}

const LEVEL = { urgent: 0, warn: 1, info: 2 };

export function openAlerts(data) {
  return data.alerts
    .filter(a => !a.resolvedAt)
    .sort((a, b) => (LEVEL[a.level] - LEVEL[b.level]) || ((a.ackAt ? 1 : 0) - (b.ackAt ? 1 : 0)) || Date.parse(b.at) - Date.parse(a.at));
}

export function streak(data, pid, now) {
  let n = 0;
  let day = addDays(dayStart(now), -1);
  for (let i = 0; i < 60; i++) {
    const list = dosesOn(data, pid, day);
    if (!list.length) break;
    if (list.some(d => d.status !== 'taken')) break;
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export function alertStats(data, from, to) {
  const list = data.alerts.filter(a => Date.parse(a.at) >= from && Date.parse(a.at) < to);
  const acked = list.filter(a => a.ackAt).map(a => (Date.parse(a.ackAt) - Date.parse(a.at)) / MIN).sort((a, b) => a - b);
  const median = acked.length ? acked[Math.floor(acked.length / 2)] : null;
  return { count: list.length, family: list.filter(a => a.kind === 'missed').length, median };
}

export function readingSeries(data, pid, type, days, now) {
  const from = dayStart(now) - (days - 1) * DAY;
  return data.readings
    .filter(r => r.personId === pid && r.type === type && Date.parse(r.at) >= from)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function unreadCount(data) {
  return [...data.people, ...data.circle].filter(x => x.unread).length;
}
