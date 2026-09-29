import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'America/Chicago';
const here = path.dirname(fileURLToPath(import.meta.url));
const { buildDemo } = await import('../src/demo/seed.js');

const now = new Date();
now.setMinutes(0, 0, 0);
const s = buildDemo(now.getTime());
const leads = s.leads.map(l => ({
  lead_id: l.id,
  phone: l.phone,
  name: l.name,
  status: l.status,
  source: l.source,
  service: l.service,
  issue: l.issue,
  urgency: l.urgency,
  urgent: !!l.urgent,
  zip: l.zip,
  address: l.address,
  offered: JSON.stringify(l.offered || []),
  slot: l.slot,
  value: l.value || 0,
  needs_call: !!l.needsCall,
  ack: l.ack !== false,
  ai_paused: !!l.aiPaused,
  follow_ups: l.followUps || 0,
  text_back_seconds: l.textBackSeconds,
  first_reply_at: l.firstReplyAt,
  alerted_at: l.alertedAt,
  booked_at: l.bookedAt,
  booked_by: l.bookedBy,
  reason: l.reason,
  summary: l.summary,
  created_at: l.createdAt,
  last_at: l.lastAt,
  call_count: l.callCount
}));
const calls = s.calls.map(c => ({ call_id: c.id, lead_id: c.leadId, phone: c.phone, at: c.at, outcome: c.outcome, ring_seconds: c.ringSeconds, duration: c.duration, text_back_seconds: c.textBackSeconds, note: c.note || null }));
const messages = s.messages.map(m => ({ msg_id: m.id, lead_id: m.leadId, phone: m.phone, dir: m.dir, author: m.author, body: m.body, at: m.at }));
const out = { anchor: now.toISOString(), timezone: process.env.TZ, leads, calls, messages };
fs.writeFileSync(path.join(here, '..', 'n8n', 'demo-business.json'), JSON.stringify(out) + '\n');
console.log('leads', leads.length, 'calls', calls.length, 'messages', messages.length, 'bytes', JSON.stringify(out).length);
