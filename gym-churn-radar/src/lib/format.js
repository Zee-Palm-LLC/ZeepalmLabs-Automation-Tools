export const DAY = 86400000;

export function money(value, currency = '$') {
  return currency + Math.round(Number(value || 0)).toLocaleString('en-US');
}

export function ago(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(hours / 24);
  return days + (days === 1 ? ' day ago' : ' days ago');
}

export const utcDay = t => new Date(t).toISOString().slice(0, 10);

export const todayKey = () => utcDay(Date.now());

export function lastSeen(member) {
  if (member.daysSinceVisit == null) return 'No recent visit';
  if (member.daysSinceVisit === 0) return 'In today';
  return 'Last seen ' + member.daysSinceVisit + (member.daysSinceVisit === 1 ? ' day ago' : ' days ago');
}

export function monthYear(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Unknown';
}

export function shortDate(key) {
  return new Date(key + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function initials(name) {
  return String(name || '?').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export const levelLabel = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Steady',
  unscored: 'Not scored'
};

export const statusLabel = {
  active: 'Active',
  frozen: 'Frozen',
  cancelled: 'Cancelled'
};
