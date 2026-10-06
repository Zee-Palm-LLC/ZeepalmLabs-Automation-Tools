export { timeLabel, dayLabel, whenLabel, providerOf, typeOf, riskOf, INTENT, phoneLabel as phone } from '../demo/engine.js';

export function money(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

export function moneyShort(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return '$' + Math.round(v);
}

export function pct(x, digits = 0) {
  const v = (Number(x) || 0) * 100;
  return (digits ? v.toFixed(digits) : Math.round(v)) + '%';
}

export function ago(t, now = Date.now()) {
  const s = Math.round((now - Date.parse(t)) / 1000);
  if (s < 0) return 'in ' + until(t, now);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  return d + ' days ago';
}

export function until(t, now = Date.now()) {
  const m = Math.max(0, Math.round((Date.parse(t) - now) / 60000));
  if (m < 1) return 'under a minute';
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h' + (m % 60 && h < 6 ? ' ' + (m % 60) + ' min' : '');
  const d = Math.round(h / 24);
  return d + (d === 1 ? ' day' : ' days');
}

export function clock(t) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function shortClock(t) {
  return clock(t).replace(':00', '');
}

export function shortDate(t) {
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function longDate(t) {
  return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function stamp(t, now = Date.now()) {
  const d = new Date(t);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return clock(t);
  const y = new Date(now - 86400000);
  if (d.toDateString() === y.toDateString()) return 'Yesterday ' + clock(t);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + clock(t);
}

export function seconds(sec) {
  const s = Math.round(Number(sec) || 0);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + String(s % 60).padStart(2, '0') + 's';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

export function displayName(p) {
  return p ? p.name || 'Unknown number' : 'Unknown';
}

export const STATUS = {
  booked: { label: 'Not confirmed', tone: 'wait' },
  confirmed: { label: 'Confirmed', tone: 'good' },
  arrived: { label: 'In the chair', tone: 'live' },
  completed: { label: 'Seen', tone: 'done' },
  no_show: { label: 'No-show', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'quiet' },
  moved: { label: 'Moved', tone: 'quiet' }
};

export function apptStatus(a) {
  if ((a.status === 'cancelled' || a.status === 'moved') && a.filledBy) return { label: a.status === 'moved' ? 'Moved, refilled' : 'Refilled', tone: 'refill' };
  if (a.source === 'waitlist' && (a.status === 'confirmed' || a.status === 'booked')) return { label: 'From waitlist', tone: 'refill' };
  return STATUS[a.status] || { label: a.status, tone: 'quiet' };
}

export const FLAG = {
  clinical: { label: 'Clinical concern', tone: 'red' },
  callback: { label: 'Wants a call', tone: 'amber' },
  reply: { label: 'Waiting for you', tone: 'blue' }
};

export const needsYou = p => !!(p.flag && !p.flag.ack);

export const WINDOWS = { any: 'Any time', mornings: 'Mornings', afternoons: 'Afternoons', late: 'After 3 PM' };
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
