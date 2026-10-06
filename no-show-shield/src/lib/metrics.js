import { DAY, MIN, HOUR, dayStart, addDays, isWorkday, nextWorkday, riskOf, ACTIVE } from '../demo/engine.js';

const sum = arr => arr.reduce((a, b) => a + b, 0);
const median = xs => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function indexes(data) {
  return {
    patients: Object.fromEntries(data.patients.map(p => [p.id, p])),
    appts: Object.fromEntries(data.appts.map(a => [a.id, a]))
  };
}

export function stats(data, now) {
  const S = data.settings;
  const since = now - 30 * DAY;
  const inWin = a => {
    const t = Date.parse(a.start);
    return t >= since && t <= now;
  };
  const past = data.appts.filter(inWin);
  const kept = past.filter(a => a.status === 'completed' || a.status === 'arrived');
  const noShows = past.filter(a => a.status === 'no_show');
  const seen = kept.length + noShows.length;
  const noShowRate = seen ? noShows.length / seen : 0;
  const avgValue = kept.length ? sum(kept.map(a => a.value)) / kept.length : 300;
  const avoided = Math.max(0, Math.round(S.baselineNoShowRate * seen - noShows.length));
  const reminded = past.filter(a => a.reminders && (a.reminders.first || a.reminders.second) && a.status !== 'moved' && a.status !== 'cancelled');
  const confirmed = reminded.filter(a => a.confirmedAt);
  const offers = data.offers.filter(o => Date.parse(o.sentAt) >= since && Date.parse(o.sentAt) <= now);
  const filled = offers.filter(o => o.status === 'filled');
  const refillValue = sum(filled.map(o => o.value || 0));
  const fillTimes = filled.map(o => (Date.parse(o.filledAt) - Date.parse(o.sentAt)) / 1000);
  const moved = data.appts.filter(a => a.status === 'moved' && a.cancelledAt && Date.parse(a.cancelledAt) >= since);
  const cancelled = data.appts.filter(a => a.status === 'cancelled' && a.cancelledAt && Date.parse(a.cancelledAt) >= since);
  const freed = moved.length + cancelled.length;
  const textConfirmed = confirmed.filter(a => a.confirmedBy === 'text').length;
  const protectedValue = refillValue + avoided * avgValue;
  const lostValue = sum(noShows.map(a => a.value));
  return {
    seen,
    kept: kept.length,
    noShows: noShows.length,
    noShowRate,
    baseline: S.baselineNoShowRate,
    avoided,
    avgValue,
    reminded: reminded.length,
    confirmed: confirmed.length,
    confirmRate: reminded.length ? confirmed.length / reminded.length : 0,
    textConfirmed,
    offers: offers.length,
    filled: filled.length,
    fillRate: freed ? filled.length / freed : 0,
    refillValue,
    medianFill: median(fillTimes),
    moved: moved.length,
    cancelled: cancelled.length,
    freed,
    protectedValue,
    lostValue,
    needsYou: data.patients.filter(p => p.flag && !p.flag.ack).length,
    unread: data.patients.filter(p => p.unread).length,
    waiting: data.waitlist.filter(w => w.status === 'waiting' || w.status === 'offered').length,
    liveOffers: data.offers.filter(o => o.status === 'open').length
  };
}

export function workdays(now, count, back = true) {
  const out = [];
  let d = dayStart(now);
  while (out.length < count) {
    if (isWorkday(d)) out.push(d);
    d = addDays(d, back ? -1 : 1);
  }
  return back ? out.reverse() : out;
}

export function dailySeries(data, now, count = 22) {
  const days = workdays(now, count);
  const idx = new Map(days.map((d, i) => [d, i]));
  const blank = () => new Array(days.length).fill(0);
  const out = { dates: days, kept: blank(), refilled: blank(), noShow: blank(), rate: blank(), saved: blank() };
  for (const a of data.appts) {
    const t = Date.parse(a.start);
    if (t > now) continue;
    const i = idx.get(dayStart(t));
    if (i == null) continue;
    if (a.status === 'no_show') out.noShow[i] += 1;
    else if (a.status === 'completed' || a.status === 'arrived') {
      if (a.source === 'waitlist') {
        out.refilled[i] += 1;
        out.saved[i] += a.value;
      } else out.kept[i] += 1;
    }
  }
  days.forEach((d, i) => {
    const total = out.kept[i] + out.refilled[i] + out.noShow[i];
    out.rate[i] = total ? out.noShow[i] / total : 0;
  });
  return out;
}

export function trend(arr) {
  const a = arr.slice(0, -1);
  const h = Math.floor(a.length / 2);
  const before = sum(a.slice(0, h));
  const after = sum(a.slice(h));
  if (!before) return null;
  return (after - before) / before;
}

export function intentMix(data, now) {
  const since = now - 30 * DAY;
  const counts = {};
  for (const a of data.appts) {
    if (!a.replyIntent) continue;
    const t = Date.parse(a.cancelledAt || a.confirmedAt || a.bookedAt || a.start);
    if (t < since || t > now) continue;
    counts[a.replyIntent] = (counts[a.replyIntent] || 0) + 1;
  }
  for (const m of data.messages) {
    if (m.dir !== 'in' || !['clinical', 'callback', 'question', 'late'].includes(m.intent)) continue;
    const t = Date.parse(m.at);
    if (t < since || t > now) continue;
    counts[m.intent] = (counts[m.intent] || 0) + 1;
  }
  return counts;
}

export function upcoming(data, now, days = 2) {
  const end = addDays(nextWorkday(now, days), 0) + DAY;
  const ix = indexes(data);
  return data.appts
    .filter(a => ACTIVE.includes(a.status) && Date.parse(a.start) > now && Date.parse(a.start) < end)
    .map(a => ({ a, p: ix.patients[a.patientId], risk: riskOf(a, ix.patients[a.patientId], now, data.settings) }))
    .sort((x, y) => Date.parse(x.a.start) - Date.parse(y.a.start));
}

export function callList(data, now) {
  return upcoming(data, now, 2)
    .filter(x => !x.a.confirmedAt && x.risk.score >= data.settings.riskCallList && !x.p.optedOut)
    .sort((x, y) => y.risk.score - x.risk.score);
}

export function scheduleDay(data, now) {
  const today = dayStart(now);
  const has = data.appts.some(a => dayStart(Date.parse(a.start)) === today);
  const inHours = new Date(now).getHours() < data.settings.closeHour;
  return isWorkday(today) && has && inHours ? today : nextWorkday(now, 1);
}

export function dayAppts(data, day) {
  return data.appts.filter(a => dayStart(Date.parse(a.start)) === day && a.status !== 'moved' && !(a.status === 'cancelled' && a.filledBy));
}

export function activity(data, now, limit = 12) {
  const ix = indexes(data);
  const out = [];
  const KINDS = { confirm: 'confirm', moved: 'moved', filled: 'filled', cancelled: 'cancelled', flag: 'flag', late: 'late', offered: 'offered' };
  for (const m of data.messages) {
    const t = Date.parse(m.at);
    if (t > now) continue;
    if (m.dir === 'note' && KINDS[m.kind]) {
      out.push({ id: m.id, kind: m.kind, at: m.at, patient: ix.patients[m.patientId], text: m.body });
    } else if (m.dir === 'in' && ['question', 'reschedule', 'callback'].includes(m.intent)) {
      out.push({ id: m.id, kind: 'reply', at: m.at, patient: ix.patients[m.patientId], text: m.body });
    }
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

export function threads(data, now) {
  const map = new Map();
  for (const m of data.messages) {
    if (Date.parse(m.at) > now && m.dir !== 'out') continue;
    const visible = Date.parse(m.at) <= now;
    let t = map.get(m.patientId);
    if (!t) {
      t = { patientId: m.patientId, last: null, lastText: null, count: 0, lastIn: null, intents: new Set() };
      map.set(m.patientId, t);
    }
    if (!visible) continue;
    t.count += 1;
    if (m.dir !== 'note') {
      if (!t.lastText || Date.parse(m.at) >= Date.parse(t.lastText.at)) t.lastText = m;
    }
    if (!t.last || Date.parse(m.at) >= Date.parse(t.last)) t.last = m.at;
    if (m.dir === 'in') {
      t.lastIn = m.at;
      if (m.intent) t.intents.add(m.intent);
    }
  }
  const ix = indexes(data);
  return [...map.values()]
    .filter(t => t.lastText && t.lastIn)
    .map(t => ({ ...t, patient: ix.patients[t.patientId] }))
    .filter(t => t.patient)
    .sort((a, b) => Date.parse(b.last) - Date.parse(a.last));
}

const HUES = ['#3fb8a7', '#7c8cff', '#e3a35a', '#d9739c', '#5aa9e6', '#9ccc65', '#b48cf2', '#e57f62'];

export function hueFor(key) {
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

export function initialsOf(p) {
  if (p && p.name) return p.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const d = String(p ? p.phone : '').replace(/\D/g, '');
  return d.slice(-2) || '?';
}

export { DAY, MIN, HOUR };
