import raw from './demo-data.json';

const DAY = 86400000;
const clone = o => JSON.parse(JSON.stringify(o));
const anchor = Date.parse(raw.anchor.slice(0, 10) + 'T00:00:00Z');
const today = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const delta = Math.round((today - anchor) / DAY);
const shiftKey = k => new Date(Date.parse(k + 'T00:00:00Z') + delta * DAY).toISOString().slice(0, 10);
const shiftIso = v => (v ? new Date(Date.parse(v) + delta * DAY).toISOString() : v);

function shift(state) {
  const s = clone(state);
  s.members.forEach(m => {
    m.recentVisits = m.recentVisits.map(shiftKey);
    m.joinDate = shiftIso(m.joinDate);
    m.lastVisit = shiftIso(m.lastVisit);
    m.lastOutreachAt = shiftIso(m.lastOutreachAt);
  });
  s.outreach.forEach(o => { o.sentAt = shiftIso(o.sentAt); });
  s.trend.forEach(p => { p.date = shiftKey(p.date); });
  s.lastScanAt = shiftIso(s.lastScanAt);
  return s;
}

function toBefore(scored) {
  const s = clone(scored);
  s.members.sort((a, b) => a.ref.localeCompare(b.ref));
  s.members.forEach(m => {
    Object.assign(m, { lastVisit: null, daysSinceVisit: null, visits30: null, visitsPrev60: null, score: null, level: 'unscored', reasons: [] });
  });
  Object.assign(s.stats, { scoredMembers: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, monthlyRevenueAtRisk: 0 });
  s.lastScanAt = null;
  return s;
}

function expand(scored) {
  const s = clone(scored);
  s.members.forEach(m => {
    m.recentVisits = m.v.map(o => new Date(anchor + o * DAY).toISOString().slice(0, 10));
    delete m.v;
  });
  s.trend = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(anchor - i * DAY).toISOString().slice(0, 10);
    s.trend.push({ date, count: s.members.reduce((a, m) => a + m.recentVisits.filter(k => k === date).length, 0) });
  }
  return s;
}

const scoredBase = shift(expand(raw.scored));
const base = { before: toBefore(scoredBase), scored: scoredBase };
const NUMERIC = ['highRiskScore', 'mediumRiskScore', 'outreachCooldownDays', 'maxOutreachPerDay', 'maxOutreachPerMember'];

let scanStart = 0;
let scans = 0;
let sentCount = 0;
let extraVisits = {};
let statuses = {};
let settings = {};

const wait = ms => new Promise(r => setTimeout(r, ms));

function current() {
  const now = Date.now();
  const el = (now - scanStart) / 1000;
  const scored = scans > 0 && el >= 1;
  const s = clone(scored ? base.scored : base.before);
  if (scored) {
    s.lastScanAt = new Date(scanStart + 1000).toISOString();
    const firstRun = scans === 1;
    const k = firstRun ? Math.max(0, Math.min(raw.fresh.length, Math.floor((el - 3) / 0.5) + 1)) : sentCount;
    if (firstRun) sentCount = Math.max(sentCount, k);
    const added = raw.fresh.slice(0, k).map((o, i) => ({ ...o, sentAt: new Date(sentBase() + i * 500).toISOString(), cameBack: false, daysToReturn: null }));
    s.outreach = [...added.reverse(), ...s.outreach];
    for (const o of added) {
      const m = s.members.find(x => x.ref === o.ref);
      if (m) {
        m.lastOutreachAt = o.sentAt;
        m.outreachCount = (m.outreachCount || 0) + 1;
        m.cameBack = false;
      }
    }
    s.stats.emailsTotal90Days += added.length;
    s.stats.emailsLast7Days += added.length;
  }
  const key = new Date(now).toISOString().slice(0, 10);
  let extra = 0;
  for (const [ref, keys] of Object.entries(extraVisits)) {
    const m = s.members.find(x => x.ref === ref);
    if (!m) continue;
    for (const k of keys) if (!m.recentVisits.includes(k)) { m.recentVisits.push(k); extra++; }
    m.daysSinceVisit = 0;
    m.lastVisit = new Date(now).toISOString();
  }
  const point = s.trend.find(p => p.date === key);
  if (point) point.count += extra;
  s.stats.visitsThisWeek += extra;
  for (const [ref, status] of Object.entries(statuses)) {
    const m = s.members.find(x => x.ref === ref);
    if (m) m.status = status;
  }
  s.settings = { ...s.settings, ...settings };
  s.gym = { ...s.gym, name: s.settings.gymName, ownerName: s.settings.ownerName, currency: s.settings.currency };
  const active = s.members.filter(m => m.status === 'active');
  s.stats.activeMembers = active.length;
  if (scored) {
    for (const m of s.members) {
      if (m.score == null) continue;
      m.level = m.score >= s.settings.highRiskScore ? 'high' : m.score >= s.settings.mediumRiskScore ? 'medium' : 'low';
    }
    const high = active.filter(m => m.level === 'high');
    const medium = active.filter(m => m.level === 'medium');
    s.stats.scoredMembers = active.length;
    s.stats.highRisk = high.length;
    s.stats.mediumRisk = medium.length;
    s.stats.lowRisk = active.length - high.length - medium.length;
    s.stats.monthlyRevenueAtRisk = [...high, ...medium].reduce((a, m) => a + m.fee, 0);
  }
  s.generatedAt = new Date(now).toISOString();
  return s;
}

let firstScanAt = 0;
const sentBase = () => firstScanAt + 3000;

export async function demoFetch() {
  await wait(220);
  return current();
}

export async function demoAction(action, params = {}) {
  await wait(260);
  if (action === 'scan') {
    scanStart = Date.now();
    scans++;
    if (scans === 1) firstScanAt = scanStart;
  } else if (action === 'reset') {
    scanStart = 0;
    scans = 0;
    sentCount = 0;
    firstScanAt = 0;
    extraVisits = {};
    statuses = {};
    settings = {};
  } else if (action === 'checkin') {
    const key = new Date().toISOString().slice(0, 10);
    extraVisits[params.member] = [...(extraVisits[params.member] || []), key];
  } else if (action === 'status') {
    statuses[params.member] = params.status;
  } else if (action === 'settings') {
    const next = { ...params };
    delete next.demoMode;
    for (const k of NUMERIC) if (k in next) next[k] = Number(next[k]);
    settings = { ...settings, ...next };
  } else {
    throw new Error('Unknown action');
  }
  return { ok: true };
}
