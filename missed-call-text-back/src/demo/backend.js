import { buildDemo } from './seed.js';
import { publicState, missedCall, inbound, ownerMessage } from './desk.js';
import { DEFAULT_SETTINGS } from './engine.js';

let state = null;

const ensure = () => state || (state = buildDemo(Date.now()));
const clone = o => JSON.parse(JSON.stringify(o));
const NUMBERS = ['vans', 'ringSeconds', 'followUpMinutes', 'finalFollowUpHours'];

export async function demoFetch() {
  return clone(publicState(ensure(), Date.now()));
}

export async function demoAction(action, p = {}) {
  const s = ensure();
  const now = Date.now();
  const lead = p.lead ? s.leads.find(l => l.id === p.lead) : null;
  if (p.lead && !lead) throw new Error('That conversation no longer exists');

  if (action === 'call') {
    const res = missedCall(s, p.phone, now, 4);
    return { ok: true, leadId: res.lead.id, callId: res.call.id };
  }
  if (action === 'sms') {
    const res = inbound(s, p.phone, String(p.body || '').slice(0, 480), now, [2600, 1900]);
    return { ok: true, leadId: res.lead.id };
  }
  if (action === 'send') {
    ownerMessage(s, lead, String(p.body || '').slice(0, 480), now);
    return { ok: true };
  }
  if (action === 'pause') {
    lead.aiPaused = String(p.paused) === 'true';
    if (!lead.aiPaused) lead.needsCall = false;
    return { ok: true };
  }
  if (action === 'ack') {
    lead.ack = true;
    lead.needsCall = false;
    return { ok: true };
  }
  if (action === 'status') {
    lead.status = p.status;
    if (p.status !== 'booked') lead.slot = null;
    return { ok: true };
  }
  if (action === 'settings') {
    const next = { ...s.settings };
    for (const [k, v] of Object.entries(p)) {
      if (!(k in DEFAULT_SETTINGS)) continue;
      if (k === 'services') next.services = typeof v === 'string' ? JSON.parse(v) : v;
      else if (NUMBERS.includes(k)) next[k] = Number(v);
      else if (typeof DEFAULT_SETTINGS[k] === 'boolean') next[k] = String(v) === 'true';
      else next[k] = String(v);
    }
    s.settings = next;
    return { ok: true };
  }
  if (action === 'reset') {
    state = buildDemo(now, s.settings);
    return { ok: true };
  }
  throw new Error('Unknown action ' + action);
}
