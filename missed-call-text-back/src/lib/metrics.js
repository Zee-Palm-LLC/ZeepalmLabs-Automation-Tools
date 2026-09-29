const DAY = 86400000;

const dayStart = t => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function dailySeries(data, now, days = 30) {
  const first = new Date(dayStart(now));
  first.setDate(first.getDate() - (days - 1));
  const dates = [];
  for (let i = 0; i < days; i++) dates.push(new Date(first.getFullYear(), first.getMonth(), first.getDate() + i).getTime());
  const index = t => {
    const s = dayStart(t);
    const i = dates.indexOf(s);
    return i;
  };
  const blank = () => new Array(days).fill(0);
  const out = { dates, missed: blank(), answered: blank(), texted: blank(), replied: blank(), booked: blank(), revenue: blank() };
  for (const c of data.calls) {
    const t = Date.parse(c.at);
    if (t > now) continue;
    const i = index(t);
    if (i < 0) continue;
    if (c.outcome === 'answered') out.answered[i] += 1;
    else out.missed[i] += 1;
  }
  for (const l of data.leads) {
    if (l.source !== 'call') continue;
    const i = index(Date.parse(l.createdAt));
    if (i < 0) continue;
    if (l.textBackSeconds != null) out.texted[i] += 1;
    if (l.firstReplyAt) out.replied[i] += 1;
    if (l.status === 'booked') {
      out.booked[i] += 1;
      out.revenue[i] += Number(l.value) || 0;
    }
  }
  return out;
}

const sum = arr => arr.reduce((a, b) => a + b, 0);

export function delta(all) {
  const arr = all.slice(0, -1);
  const h = Math.floor(arr.length / 2);
  const recent = sum(arr.slice(h));
  const before = sum(arr.slice(0, h));
  if (!before) return null;
  return (recent - before) / before;
}

export function ratioDelta(topAll, bottomAll) {
  const top = topAll.slice(0, -1);
  const bottom = bottomAll.slice(0, -1);
  const h = Math.floor(top.length / 2);
  const r = (a, b) => (sum(b) ? sum(a) / sum(b) : null);
  const recent = r(top.slice(h), bottom.slice(h));
  const before = r(top.slice(0, h), bottom.slice(0, h));
  if (recent == null || !before) return null;
  return recent - before;
}

export function serviceMix(data, now) {
  const since = now - 30 * DAY;
  const by = {};
  for (const l of data.leads) {
    if (l.status !== 'booked' || Date.parse(l.createdAt) < since) continue;
    const key = l.service || 'other';
    const s = (data.settings.services || []).find(x => x.key === key);
    if (!by[key]) by[key] = { key, name: s ? s.name : l.issue || 'General plumbing', value: 0, count: 0 };
    by[key].value += Number(l.value) || 0;
    by[key].count += 1;
  }
  return Object.values(by).sort((a, b) => b.value - a.value);
}

export function medianMinutesToBook(data, now) {
  const since = now - 30 * DAY;
  const xs = data.leads
    .filter(l => l.status === 'booked' && l.bookedBy === 'ai' && l.bookedAt && Date.parse(l.createdAt) >= since)
    .map(l => (Date.parse(l.bookedAt) - Date.parse(l.createdAt)) / 60000)
    .sort((a, b) => a - b);
  return xs.length ? Math.max(1, Math.round(xs[Math.floor(xs.length / 2)])) : 0;
}

export function activity(data, now, limit = 14) {
  const leads = Object.fromEntries(data.leads.map(l => [l.id, l]));
  const events = [];
  for (const c of data.calls) {
    if (c.outcome === 'answered' || Date.parse(c.at) > now) continue;
    events.push({ id: 'e' + c.id, kind: 'missed', at: c.at, leadId: c.leadId, title: c.outcome === 'after_hours' ? 'Missed call after hours' : 'Missed call' });
  }
  const seenIn = new Set();
  const seenOut = new Set();
  for (const m of data.messages) {
    if (Date.parse(m.at) > now) continue;
    if (m.dir === 'out' && m.author === 'ai' && !seenOut.has(m.leadId)) {
      seenOut.add(m.leadId);
      events.push({ id: 'e' + m.id, kind: 'text', at: m.at, leadId: m.leadId, title: 'Texted back automatically' });
    }
    if (m.dir === 'in' && !seenIn.has(m.leadId)) {
      seenIn.add(m.leadId);
      events.push({ id: 'e' + m.id, kind: 'reply', at: m.at, leadId: m.leadId, title: 'Customer replied', detail: m.body });
    }
    if (m.dir === 'note' && /^Booked by AI/.test(m.body)) events.push({ id: 'e' + m.id, kind: 'booked', at: m.at, leadId: m.leadId, title: 'Job booked by AI', detail: m.body.replace(/^Booked by AI: /, '') });
    if (m.dir === 'note' && /Emergency visit/.test(m.body)) events.push({ id: 'e' + m.id, kind: 'booked', at: m.at, leadId: m.leadId, title: 'Emergency visit dispatched' });
    if (m.dir === 'note' && /alerted/.test(m.body)) events.push({ id: 'e' + m.id, kind: 'alert', at: m.at, leadId: m.leadId, title: 'Owner alerted', detail: m.body.replace(/^.*alerted by text: /, '') });
    if (m.dir === 'note' && /called back and booked/.test(m.body)) events.push({ id: 'e' + m.id, kind: 'booked', at: m.at, leadId: m.leadId, title: 'Booked on a call back' });
  }
  return events
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit)
    .map(e => ({ ...e, lead: leads[e.leadId] || null }));
}

const HUES = ['#5b8cff', '#9b7bff', '#2bd17e', '#ffb547', '#ff6b8b', '#36c6d9', '#f97a4a', '#b6e35a'];

export function hueFor(key) {
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

export function initialsOf(lead) {
  if (lead && lead.name) return lead.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const d = String(lead ? lead.phone : '').replace(/\D/g, '');
  return d.slice(-2) || '?';
}
