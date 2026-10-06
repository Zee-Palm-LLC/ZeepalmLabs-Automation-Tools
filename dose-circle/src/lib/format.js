import { zoned, dayStart, addDays, hourOf, shortTime, phoneLabel, DAY } from '../demo/engine.js';

export const clock = t => new Date(t).toLocaleTimeString('en-US', zoned({ hour: 'numeric', minute: '2-digit' }));
export const time = t => shortTime(t);
export const fullDate = t => new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'long', month: 'long', day: 'numeric' }));
export const shortDate = t => new Date(t).toLocaleDateString('en-US', zoned({ month: 'short', day: 'numeric' }));
export const weekdayShort = t => new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'short' }));
export const weekdayLong = t => new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'long' }));
export const dayNum = t => new Date(t).toLocaleDateString('en-US', zoned({ day: 'numeric' }));
export const phone = phoneLabel;

export function dayName(t, now) {
  const d = dayStart(typeof t === 'number' ? t : Date.parse(t));
  const today = dayStart(now);
  if (d === today) return 'Today';
  if (d === addDays(today, -1)) return 'Yesterday';
  if (d === addDays(today, 1)) return 'Tomorrow';
  return new Date(d + DAY / 2).toLocaleDateString('en-US', zoned({ weekday: 'long', month: 'short', day: 'numeric' }));
}

export function ago(t, now) {
  const s = Math.max(0, (now - Date.parse(t)) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (dayStart(Date.parse(t)) === dayStart(now)) return 'at ' + shortTime(t);
  if (dayStart(Date.parse(t)) === addDays(dayStart(now), -1)) return 'yesterday, ' + shortTime(t);
  return shortDate(t) + ', ' + shortTime(t);
}

export function until(t, now) {
  const m = Math.round((Date.parse(t) - now) / 60000);
  if (m <= 0) return 'now';
  if (m < 60) return 'in ' + m + ' min';
  const h = Math.floor(m / 60);
  return 'in ' + h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
}

export const pct = v => (v == null || !isFinite(v) ? '–' : Math.round(v * 100) + '%');

export function greeting(now) {
  const h = hourOf(now);
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const initials = name => String(name || '?').split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();
export const first = name => String(name || '').split(' ')[0];
export const plural = (n, word, many) => n + ' ' + (n === 1 ? word : many || word + 's');
