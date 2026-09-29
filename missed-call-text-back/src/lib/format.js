export { slotLabel, timeLabel, dayLabel, stageOf, suggestions, serviceOf, isOpen } from '../demo/engine.js';

export function phone(p) {
  const d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (d.length !== 10) return p || '';
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}

export function money(n, cur = '$') {
  return cur + Math.round(Number(n) || 0).toLocaleString('en-US');
}

export function pct(x) {
  return Math.round((Number(x) || 0) * 100) + '%';
}

export function ago(t, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(t)) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  return d + ' days ago';
}

export function clock(t) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function shortDate(t) {
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function stamp(t, now = Date.now()) {
  const d = new Date(t);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return clock(t);
  const y = new Date(now - 86400000);
  if (d.toDateString() === y.toDateString()) return 'Yesterday ' + clock(t);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + clock(t);
}

export function duration(sec) {
  const s = Math.round(Number(sec) || 0);
  if (s < 60) return s + 's';
  return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
}

export function gap(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return '+' + s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return '+' + m + ':' + String(s % 60).padStart(2, '0');
  return '+' + Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

export function displayName(lead) {
  return lead.name || phone(lead.phone);
}

export const STATUS = {
  texted: { label: 'Waiting', tone: 'wait' },
  chatting: { label: 'Chatting', tone: 'live' },
  urgent: { label: 'Urgent', tone: 'urgent' },
  booked: { label: 'Booked', tone: 'booked' },
  no_reply: { label: 'No reply', tone: 'quiet' },
  lost: { label: 'Lost', tone: 'lost' },
  opted_out: { label: 'Opted out', tone: 'quiet' }
};

export function needsYou(lead) {
  return (lead.urgent || lead.needsCall) && !lead.ack && !['lost', 'opted_out'].includes(lead.status);
}
