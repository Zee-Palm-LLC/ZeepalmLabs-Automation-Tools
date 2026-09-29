import { DAY, MIN, OPEN_STATUSES, respond, textBackMessage, followUpMessage, isOpen, slotLabel } from './engine.js';

const iso = t => new Date(t).toISOString();

export function emptyState(settings) {
  return { settings: JSON.parse(JSON.stringify(settings)), leads: [], calls: [], messages: [], seq: 0 };
}

export function nextId(s, prefix) {
  s.seq += 1;
  return prefix + s.seq.toString(36).padStart(4, '0');
}

export function addMessage(s, lead, dir, author, body, at) {
  const m = { id: nextId(s, 'm'), leadId: lead.id, phone: lead.phone, dir, author, body, at: iso(at) };
  s.messages.push(m);
  if (dir !== 'note' && Date.parse(lead.lastAt || 0) < at) lead.lastAt = iso(at);
  return m;
}

function latestLead(s, phone) {
  return s.leads.filter(l => l.phone === phone).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

function newLead(s, phone, at, source) {
  const lead = {
    id: nextId(s, 'l'),
    phone,
    name: null,
    status: 'texted',
    source,
    createdAt: iso(at),
    lastAt: iso(at),
    callCount: 0,
    service: null,
    issue: null,
    urgency: null,
    urgent: false,
    zip: null,
    address: null,
    offered: [],
    slot: null,
    value: 0,
    needsCall: false,
    ack: true,
    aiPaused: false,
    followUps: 0,
    textBackSeconds: null,
    firstReplyAt: null,
    alertedAt: null,
    bookedAt: null,
    bookedBy: null,
    reason: null,
    summary: null,
    pref: null
  };
  s.leads.push(lead);
  return lead;
}

export function missedCall(s, phone, at, textBackSeconds = 4) {
  const open = isOpen(s.settings, at);
  const call = { id: nextId(s, 'c'), phone, at: iso(at), outcome: open ? 'missed' : 'after_hours', ringSeconds: Number(s.settings.ringSeconds) || 20, duration: 0, leadId: null, textBackSeconds: null };
  s.calls.push(call);
  const prev = latestLead(s, phone);
  if (prev && prev.status === 'opted_out') {
    call.leadId = prev.id;
    call.note = 'Opted out, no text sent';
    return { call, lead: prev };
  }
  const recent = prev && at - Date.parse(prev.lastAt) < 3 * DAY && prev.status !== 'lost';
  const lead = recent ? prev : newLead(s, phone, at, 'call');
  lead.callCount += 1;
  call.leadId = lead.id;
  const talking = recent && s.messages.some(m => m.leadId === lead.id && m.dir === 'in' && at - Date.parse(m.at) < 2 * 3600000);
  if (talking) {
    call.note = 'Already texting';
    return { call, lead };
  }
  const sendAt = at + textBackSeconds * 1000;
  addMessage(s, lead, 'out', 'ai', textBackMessage(s.settings, at), sendAt);
  call.textBackSeconds = textBackSeconds;
  if (lead.textBackSeconds == null) lead.textBackSeconds = textBackSeconds;
  if (lead.status === 'no_reply') lead.status = 'texted';
  return { call, lead };
}

export function answeredCall(s, phone, at, duration) {
  const call = { id: nextId(s, 'c'), phone, at: iso(at), outcome: 'answered', ringSeconds: 6, duration, leadId: null, textBackSeconds: null };
  s.calls.push(call);
  return call;
}

export function inbound(s, phone, body, at, delays = [5000, 2200]) {
  let lead = latestLead(s, phone);
  if (!lead || (at - Date.parse(lead.lastAt) > 14 * DAY)) lead = newLead(s, phone, at, 'sms');
  addMessage(s, lead, 'in', 'customer', body, at);
  if (!lead.firstReplyAt) lead.firstReplyAt = iso(at);
  if (!s.settings.aiEnabled || lead.aiPaused) {
    if (!['opted_out'].includes(lead.status)) {
      lead.needsCall = true;
      lead.ack = false;
    }
    if (lead.status === 'texted') lead.status = 'chatting';
    return { lead, replies: [] };
  }
  const res = respond({ settings: s.settings, lead, leads: s.leads, text: body, now: at });
  Object.assign(lead, res.patch);
  const replies = res.replies.map((text, i) => addMessage(s, lead, 'out', 'ai', text, at + delays[0] + i * delays[1]));
  const last = at + delays[0] + Math.max(0, res.replies.length - 1) * delays[1];
  for (const e of res.events) {
    if (e.kind === 'urgent' || e.kind === 'call') {
      lead.alertedAt = lead.alertedAt || iso(last);
      addMessage(s, lead, 'note', 'system', s.settings.ownerName + ' alerted by text: ' + e.text.toLowerCase(), last + 400);
    }
    if (e.kind === 'booked' || e.kind === 'dispatch') {
      addMessage(s, lead, 'note', 'system', e.kind === 'booked' ? 'Booked by AI: ' + e.text : e.text, last + 400);
    }
  }
  return { lead, replies, events: res.events };
}

export function ownerMessage(s, lead, body, at) {
  lead.aiPaused = true;
  if (lead.status === 'texted') lead.status = 'chatting';
  return addMessage(s, lead, 'out', 'owner', body, at);
}

export function followUp(s, lead, n, at) {
  lead.followUps = n;
  addMessage(s, lead, 'out', 'ai', followUpMessage(s.settings, n), at);
  if (n >= 2) lead.status = 'no_reply';
}

export function ownerBook(s, lead, slot, at) {
  lead.status = 'booked';
  lead.slot = slot;
  lead.bookedBy = 'owner';
  lead.bookedAt = iso(at);
  lead.needsCall = false;
  lead.ack = true;
  const svc = (s.settings.services || []).find(x => x.key === lead.service);
  lead.value = svc ? svc.typical : 240;
  addMessage(s, lead, 'note', 'system', s.settings.ownerName + ' called back and booked ' + slotLabel(slot, at), at);
}

export function computeStats(s, now) {
  const since = now - 30 * DAY;
  const calls = s.calls.filter(c => Date.parse(c.at) >= since && Date.parse(c.at) <= now);
  const missed = calls.filter(c => c.outcome !== 'answered');
  const leads = s.leads.filter(l => Date.parse(l.createdAt) >= since && l.source === 'call');
  const texted = leads.filter(l => l.textBackSeconds != null);
  const replied = leads.filter(l => l.firstReplyAt);
  const booked = leads.filter(l => l.status === 'booked');
  const recovered = booked.reduce((a, l) => a + (Number(l.value) || 0), 0);
  const avg = texted.length ? texted.reduce((a, l) => a + l.textBackSeconds, 0) / texted.length : 0;
  const byStatus = {};
  for (const l of leads) byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const c of missed) {
    const d = new Date(c.at);
    heat[d.getDay()][d.getHours()] += 1;
  }
  const bookedByAi = booked.filter(l => l.bookedBy === 'ai').length;
  const needsYou = s.leads.filter(l => (l.urgent || l.needsCall) && !l.ack && !['lost', 'opted_out'].includes(l.status)).length;
  return {
    calls: calls.length,
    answered: calls.length - missed.length,
    missed: missed.length,
    afterHours: missed.filter(c => c.outcome === 'after_hours').length,
    texted: texted.length,
    replied: replied.length,
    booked: booked.length,
    bookedByAi,
    urgent: leads.filter(l => l.urgent).length,
    recovered,
    avgTextBack: Math.round(avg * 10) / 10,
    replyRate: texted.length ? replied.length / texted.length : 0,
    bookRate: missed.length ? booked.length / missed.length : 0,
    byStatus,
    heat,
    needsYou,
    open: s.leads.filter(l => OPEN_STATUSES.includes(l.status)).length
  };
}

export function publicState(s, now) {
  const visible = s.messages.filter(m => Date.parse(m.at) <= now + 60 * MIN);
  return {
    settings: s.settings,
    leads: [...s.leads].sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt)),
    calls: [...s.calls].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    messages: visible.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    stats: computeStats(s, now),
    now: iso(now)
  };
}
