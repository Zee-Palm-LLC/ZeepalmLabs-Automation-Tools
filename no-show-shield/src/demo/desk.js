import {
  DEFAULT_SETTINGS, MIN, HOUR, DAY, ACTIVE, fill, textVars, whenLabel, dayLabel, timeLabel, providerOf, typeOf, firstName,
  classify, parsePref, searchDays, openSlots, pickOption, faq, phoneLabel, parts, NL
} from './engine.js';

const iso = t => new Date(t).toISOString();

export function emptyState(settings = DEFAULT_SETTINGS) {
  return { settings: { ...settings }, patients: [], appts: [], waitlist: [], offers: [], messages: [], queue: [], seq: 0 };
}

export const uid = (s, p) => p + (++s.seq).toString(36);

export function addMessage(s, m) {
  const msg = { id: uid(s, 'm'), apptId: null, offerId: null, intent: null, ...m };
  s.messages.push(msg);
  return msg;
}

export function note(s, patientId, body, at, extra = {}) {
  return addMessage(s, { patientId, dir: 'note', author: 'system', body, at: iso(at), ...extra });
}

export const patientById = (s, id) => s.patients.find(p => p.id === id);
export const apptById = (s, id) => s.appts.find(a => a.id === id);

export function nextAppt(s, p, now) {
  return s.appts
    .filter(a => a.patientId === p.id && ACTIVE.includes(a.status) && Date.parse(a.start) + a.minutes * MIN > now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0] || null;
}

function openOfferFor(s, p, now) {
  const list = s.offers
    .filter(o => o.candidates.some(c => c.patientId === p.id && !c.reply) && Date.parse(o.sentAt) <= now + 5000 && now - Date.parse(o.sentAt) < 6 * HOUR)
    .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  return list[0] || null;
}

export function sendReminder(s, appt, kind, now, author = 'ai') {
  const p = patientById(s, appt.patientId);
  if (!p || p.optedOut) return null;
  const S = s.settings;
  const tpl = kind === 'first' ? S.templateFirst : kind === 'final' ? S.templateFinal : S.templateSecond;
  appt.reminders = { ...(appt.reminders || {}), [kind]: iso(now) };
  return addMessage(s, { patientId: p.id, apptId: appt.id, dir: 'out', author, kind: 'reminder', body: fill(tpl, textVars(S, appt, p, now)), at: iso(now) });
}

export function flag(s, p, kind, now, text) {
  p.flag = { kind, at: iso(now), text, ack: false };
}

export function newPatient(s, phone, now, name = null) {
  const p = { id: uid(s, 'p'), name, phone, since: iso(now), visits: 0, noShows: 0, lateCancels: 0, optedOut: false, aiPaused: false, flag: null, pending: null, lastReplyAt: null, unread: false };
  s.patients.push(p);
  return p;
}

export function inbound(s, phone, body, now, delays = [2300, 1700], opts = {}) {
  let p = s.patients.find(x => x.phone === phone);
  if (!p) p = newPatient(s, phone, now);
  const local = classify(body);
  const intent = ['clinical', 'stop', 'start', 'callback'].includes(local) || !opts.intent ? local : opts.intent;
  const msg = addMessage(s, { patientId: p.id, dir: 'in', author: 'patient', body, at: iso(now), intent });
  p.lastReplyAt = iso(now);
  p.unread = true;
  if (!s.settings.aiEnabled || p.aiPaused) {
    note(s, p.id, p.aiPaused ? 'AI is paused for this patient. Waiting for the front desk.' : 'AI replies are off. Waiting for the front desk.', now + 200);
    if (!p.flag || p.flag.ack) flag(s, p, 'reply', now, body);
    return { patient: p, intent, msg };
  }
  const res = respond(s, p, body, now, msg, opts);
  let t = now;
  res.replies.forEach((r, i) => {
    t += delays[Math.min(i, delays.length - 1)];
    addMessage(s, { patientId: p.id, apptId: res.apptId || null, offerId: res.offerId || null, dir: 'out', author: 'ai', kind: res.kind || 'reply', body: r, at: iso(t) });
  });
  return { patient: p, intent: res.intent, msg };
}

const optionLine = (s, o, i, now, base) => {
  const prov = providerOf(s.settings, o.provider);
  return (i + 1) + ') ' + whenLabel(o.start, now).replace(/^(today|tomorrow), /, '') + (o.provider !== base ? ' with ' + prov.short : '');
};

function findOptions(s, appt, pref, now) {
  const S = s.settings;
  const role = typeOf(S, appt.type).role;
  const providers = [appt.provider, ...S.providers.filter(x => x.role === role && x.key !== appt.provider).map(x => x.key)];
  const base = { minutes: appt.minutes, providers, now, ignoreId: appt.id };
  let opts = openSlots(s, { ...base, days: searchDays(pref, now), from: pref.from, to: pref.to });
  let widened = false;
  if (!opts.length && pref.days.length) {
    opts = openSlots(s, { ...base, days: searchDays({ days: [] }, Math.max(...pref.days)), from: pref.from, to: pref.to });
    widened = true;
  }
  if (!opts.length) {
    opts = openSlots(s, { ...base, days: searchDays({ days: [] }, now, 8) });
    widened = true;
  }
  return { opts, widened };
}

function respond(s, p, body, now, msg, hint = {}) {
  const S = s.settings;
  let intent = msg.intent;
  const appt = nextAppt(s, p, now);
  const offer = openOfferFor(s, p, now);
  const pend = p.pending;
  const out = [];
  const say = t => out.push(t);
  const first = firstName(p.name);
  const res = { replies: out, intent, apptId: appt ? appt.id : null };
  const mark = i => {
    intent = i;
    msg.intent = i;
    res.intent = i;
    if (appt && !appt.replyIntent) appt.replyIntent = i;
  };

  if (intent === 'stop') {
    p.optedOut = true;
    p.pending = null;
    say('You’re unsubscribed from ' + S.shortName + ' texts. Reply START to opt back in.');
    note(s, p.id, 'Opted out of texts', now + 100);
    return res;
  }
  if (intent === 'start') {
    p.optedOut = false;
    say('You’re subscribed again. We’ll text your appointment reminders.');
    return res;
  }
  if (intent === 'clinical') {
    mark('clinical');
    flag(s, p, 'clinical', now, body);
    say('I’m sorry you’re dealing with that, ' + first + '. I can’t give medical advice by text, so I’ve flagged this for our clinical team and someone will call you shortly. If it feels like an emergency, call 911 now.');
    note(s, p.id, 'Flagged for the clinical team. No advice was given by text.', now + 120, { kind: 'flag' });
    return res;
  }
  if (intent === 'callback') {
    mark('callback');
    flag(s, p, 'callback', now, body);
    say('Of course. I’ve asked the front desk to call you back. They’ll ring from ' + phoneLabel(S.clinicPhone) + ' during opening hours.');
    note(s, p.id, 'Call back requested', now + 120, { kind: 'flag' });
    return res;
  }

  if (offer) {
    const cand = offer.candidates.find(c => c.patientId === p.id);
    if (intent === 'confirm' || /(?<![a-z0-9])(yes|yeah|yep|sure|ok|okay|take it|book it|please|y)(?![a-z0-9])/i.test(body)) {
      res.offerId = offer.id;
      if (offer.status === 'open') {
        const booked = acceptOffer(s, offer, cand, now);
        mark('accept');
        res.apptId = booked.id;
        say('It’s yours, ' + first + '. You’re booked ' + whenLabel(offer.start, now) + ' with ' + providerOf(S, offer.provider).short + '. We’ll text a reminder before the visit.');
      } else {
        cand.reply = 'late';
        cand.replyAt = iso(now);
        mark('taken');
        say('Sorry, ' + first + ', that spot was just taken by someone who replied first. You’re still on the waitlist and we’ll text you the next opening.');
      }
      return res;
    }
    if (intent === 'decline') {
      cand.reply = 'no';
      cand.replyAt = iso(now);
      const w = s.waitlist.find(x => x.id === cand.waitId);
      if (w && w.status === 'offered') w.status = 'waiting';
      mark('decline');
      say('No problem, you’re still on the waitlist. We’ll text you when another time opens up.');
      return res;
    }
  }

  if (intent === 'late') {
    mark('late');
    if (appt) appt.late = iso(now);
    say('Thanks for letting us know, ' + first + '. I’ve told the front desk. If you’ll be more than 15 minutes late we may need to move your visit, and they’ll text you if so.');
    note(s, p.id, 'Running late: “' + body + '”', now + 100, { kind: 'late' });
    return res;
  }

  if (pend && pend.kind === 'pick') {
    const i = Number.isInteger(hint.pick) && hint.pick >= 0 && hint.pick < pend.options.length ? hint.pick : pickOption(body, pend.options);
    if (i >= 0) {
      const old = apptById(s, pend.apptId);
      const moved = bookFrom(s, old, pend.options[i], now, 'text');
      p.pending = null;
      mark('reschedule');
      res.apptId = moved.id;
      say('Done. You’re now booked ' + whenLabel(moved.start, now) + ' with ' + providerOf(S, moved.provider).short + '. ' + (pend.rebook ? 'See you then!' : 'Your old time has gone to someone on our waitlist, so thank you for letting us know.'));
      return res;
    }
  }

  const pref = parsePref(hint.when || body, now, S);
  const wantsTime = intent === 'reschedule' || (pend && (pend.kind === 'when' || pend.kind === 'pick') && pref.has);

  if (wantsTime) {
    const target = pend && pend.apptId ? apptById(s, pend.apptId) : appt;
    if (!target) {
      say('I can’t find an upcoming visit for this number. Reply CALL and the front desk will sort it out.');
      return res;
    }
    mark('reschedule');
    if (!pref.has) {
      p.pending = { kind: 'when', apptId: target.id, rebook: pend ? !!pend.rebook : false };
      say('No problem, ' + first + '. What day and time would suit you better? For example “Thursday afternoon” or “next week, mornings”.');
      return res;
    }
    const { opts, widened } = findOptions(s, target, pref, now);
    if (!opts.length) {
      p.pending = { kind: 'when', apptId: target.id, rebook: pend ? !!pend.rebook : false };
      flag(s, p, 'callback', now, body);
      say('I couldn’t find an opening that fits. I’ve asked the front desk to call you with some options.');
      return res;
    }
    p.pending = { kind: 'pick', apptId: target.id, options: opts, rebook: pend ? !!pend.rebook : false };
    const lines = opts.map((o, i) => optionLine(s, o, i, now, target.provider));
    say((widened ? 'That’s fully booked, but here’s the closest' : 'Here’s what’s open') + ' with ' + providerOf(S, target.provider).short + ':' + NL + lines.join(NL) + NL + 'Reply ' + (opts.length === 1 ? '1' : opts.length === 2 ? '1 or 2' : '1, 2 or 3') + ' to pick one.');
    note(s, p.id, 'Offered ' + opts.length + ' open time' + (opts.length === 1 ? '' : 's') + (pref.part ? ' (' + pref.part + ')' : ''), now + 150, { kind: 'options' });
    return res;
  }

  if (pend && pend.kind === 'pick' && intent !== 'cancel' && intent !== 'question') {
    say('Just reply ' + (pend.options.length === 1 ? '1' : pend.options.length === 2 ? '1 or 2' : '1, 2 or 3') + ' to pick a time, or tell me a day that suits you better.');
    return res;
  }

  if (intent === 'cancel') {
    if (!appt) {
      say('I can’t find an upcoming visit for this number. Reply CALL and the front desk will help.');
      return res;
    }
    mark('cancel');
    const when = whenLabel(appt.start, now);
    cancelAppt(s, appt, now, 'text');
    p.pending = { kind: 'when', apptId: appt.id, rebook: true };
    say('Okay, your visit ' + when + ' is cancelled. If you’d like to book another time, just reply with a day that suits you.');
    return res;
  }

  if (intent === 'confirm') {
    if (!appt) {
      say('Thanks, ' + first + '! There’s nothing booked for this number right now. Reply CALL if you’d like the front desk to book you in.');
      return res;
    }
    mark('confirm');
    if (appt.confirmedAt) {
      say('You’re all set for ' + whenLabel(appt.start, now) + '. See you then!');
      return res;
    }
    appt.confirmedAt = iso(now);
    appt.confirmedBy = 'text';
    appt.status = 'confirmed';
    say('Thanks, ' + first + '. You’re confirmed for ' + whenLabel(appt.start, now) + ' with ' + providerOf(S, appt.provider).short + '. Reply R if anything changes.');
    note(s, p.id, 'Confirmed by text', now + 100, { kind: 'confirm', apptId: appt.id });
    return res;
  }

  if (intent === 'question') {
    mark('question');
    const ans = faq(body, S, appt);
    say((ans || 'Good question. I’ve passed it to the front desk and they’ll text you back.') + (appt && !appt.confirmedAt ? ' Reply C to confirm your visit ' + dayLabel(appt.start, now) + '.' : ''));
    if (!ans) flag(s, p, 'callback', now, body);
    return res;
  }

  if (intent === 'thanks') {
    say(appt ? 'You’re welcome! See you ' + dayLabel(appt.start, now) + '.' : 'You’re welcome!');
    return res;
  }

  mark('other');
  say('Sorry, I didn’t catch that. Reply C to confirm, R to reschedule, or CALL and the front desk will phone you.');
  return res;
}

export function bookFrom(s, old, slot, now, by) {
  const S = s.settings;
  const n = {
    ...old,
    id: uid(s, 'a'),
    start: slot.start,
    provider: slot.provider,
    status: 'confirmed',
    confirmedAt: iso(now),
    confirmedBy: 'move',
    bookedAt: iso(now),
    reminders: {},
    movedFrom: old.id,
    movedTo: null,
    source: by,
    replyIntent: null,
    offerId: null,
    filledBy: null,
    late: null,
    cancelledAt: null
  };
  s.appts.push(n);
  const freed = ACTIVE.includes(old.status);
  if (freed) {
    old.status = 'moved';
    old.cancelledAt = iso(now);
  }
  old.movedTo = n.id;
  note(s, old.patientId, (freed ? 'Moved by text from ' + whenLabel(old.start, now) + ' to ' : 'Rebooked by text for ') + whenLabel(n.start, now), now + 140, { kind: 'moved', apptId: n.id });
  if (freed) backfill(s, old, now + 1200);
  return n;
}

export function cancelAppt(s, appt, now, by) {
  const p = patientById(s, appt.patientId);
  appt.status = 'cancelled';
  appt.cancelledAt = iso(now);
  appt.cancelledBy = by;
  if (Date.parse(appt.start) - now < DAY && p) p.lateCancels += 1;
  note(s, appt.patientId, 'Cancelled ' + (by === 'text' ? 'by text' : 'by the front desk') + ': ' + whenLabel(appt.start, now), now + 140, { kind: 'cancelled', apptId: appt.id });
  return backfill(s, appt, now + 1200);
}

export function rankWaitlist(s, freed, now) {
  const S = s.settings;
  const prov = providerOf(S, freed.provider);
  const pp = parts(freed.start);
  const h = pp.h;
  const wd = pp.wd;
  const start = Date.parse(freed.start);
  const tried = new Set();
  for (const o of s.offers) if (o.apptId === freed.id) o.candidates.forEach(c => tried.add(c.patientId));
  return s.waitlist
    .filter(w => w.status === 'waiting' && !tried.has(w.patientId))
    .map(w => {
      const t = typeOf(S, w.type);
      const p = patientById(s, w.patientId);
      if (!p || p.optedOut) return null;
      if (t.role !== prov.role || t.minutes > freed.minutes) return null;
      if (w.provider !== 'any' && w.provider !== freed.provider) return null;
      if (w.window === 'mornings' && h >= S.lunchHour) return null;
      if (w.window === 'afternoons' && h < S.lunchHour) return null;
      if (w.window === 'late' && h < 15) return null;
      if (w.days && w.days.length && !w.days.includes(wd)) return null;
      const clash = s.appts.some(a => a.patientId === p.id && ACTIVE.includes(a.status) && Math.abs(Date.parse(a.start) - start) < 3 * HOUR);
      if (clash) return null;
      const waited = Math.max(0, (now - Date.parse(w.addedAt)) / DAY);
      const reasons = [];
      let score = 40 + Math.min(30, waited * 1.2);
      reasons.push('Waiting ' + Math.max(1, Math.round(waited)) + ' day' + (Math.round(waited) === 1 ? '' : 's'));
      if (t.minutes === freed.minutes) {
        score += 8;
        reasons.push('Same length visit');
      }
      if (w.provider === freed.provider) {
        score += 6;
        reasons.push('Asked for ' + prov.short);
      }
      if (w.priority) {
        score += 14;
        reasons.push('Flagged as urgent');
      }
      if (p.noShows) {
        score -= 12 * p.noShows;
        reasons.push('Missed a visit before');
      }
      return { w, p, score: Math.round(score), reasons, value: t.value };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .filter((r, i, all) => all.findIndex(x => x.p.id === r.p.id) === i);
}

export function backfill(s, freed, now, force = false) {
  const S = s.settings;
  if (!S.autoFill && !force) {
    note(s, freed.patientId, 'Time released. Auto-fill is off, so it stays open.', now, { kind: 'released', apptId: freed.id });
    return null;
  }
  if (Date.parse(freed.start) - now < S.minNoticeHours * HOUR) return null;
  if (s.offers.some(o => o.apptId === freed.id && o.status === 'open')) return null;
  const ranked = rankWaitlist(s, freed, now).slice(0, S.offerBatch);
  if (!ranked.length) {
    note(s, freed.patientId, 'Time released. Nobody on the waitlist fits it yet.', now, { kind: 'released', apptId: freed.id });
    return null;
  }
  const offer = {
    id: uid(s, 'o'),
    apptId: freed.id,
    provider: freed.provider,
    start: freed.start,
    minutes: freed.minutes,
    reason: freed.status,
    sentAt: iso(now),
    expiresAt: iso(now + S.offerMinutes * MIN),
    status: 'open',
    filledAt: null,
    winner: null,
    newApptId: null,
    value: ranked[0].value,
    candidates: ranked.map(r => ({ waitId: r.w.id, patientId: r.p.id, score: r.score, reasons: r.reasons, reply: null, replyAt: null }))
  };
  s.offers.push(offer);
  freed.offerId = offer.id;
  ranked.forEach((r, i) => {
    r.w.status = 'offered';
    r.w.offerId = offer.id;
    const vars = textVars(S, freed, r.p, now);
    addMessage(s, { patientId: r.p.id, offerId: offer.id, dir: 'out', author: 'ai', kind: 'offer', body: fill(S.templateOffer, vars), at: iso(now + 300 + i * 350) });
  });
  note(s, freed.patientId, 'Offered to ' + ranked.length + ' on the waitlist', now + 60, { kind: 'offered', apptId: freed.id, offerId: offer.id });
  return offer;
}

export function acceptOffer(s, offer, cand, now) {
  const S = s.settings;
  const w = s.waitlist.find(x => x.id === cand.waitId);
  const t = typeOf(S, w.type);
  const n = {
    id: uid(s, 'a'),
    patientId: cand.patientId,
    provider: offer.provider,
    type: w.type,
    start: offer.start,
    minutes: t.minutes,
    value: t.value,
    status: 'confirmed',
    confirmedAt: iso(now),
    confirmedBy: 'offer',
    bookedAt: iso(now),
    reminders: {},
    source: 'waitlist',
    fromAppt: offer.apptId,
    replyIntent: 'accept'
  };
  s.appts.push(n);
  offer.status = 'filled';
  offer.filledAt = iso(now);
  offer.winner = cand.waitId;
  offer.newApptId = n.id;
  offer.value = t.value;
  cand.reply = 'yes';
  cand.replyAt = iso(now);
  const freed = apptById(s, offer.apptId);
  if (freed) freed.filledBy = n.id;
  w.status = 'booked';
  w.apptId = n.id;
  w.bookedAt = iso(now);
  for (const c of offer.candidates) {
    if (c.waitId === cand.waitId) continue;
    const other = s.waitlist.find(x => x.id === c.waitId);
    if (other && other.status === 'offered' && other.offerId === offer.id) other.status = 'waiting';
  }
  note(s, cand.patientId, 'Booked from the waitlist: ' + whenLabel(offer.start, now), now + 100, { kind: 'filled', apptId: n.id, offerId: offer.id });
  if (freed) note(s, freed.patientId, 'Slot refilled from the waitlist in ' + Math.max(1, Math.round((now - Date.parse(offer.sentAt)) / 1000)) + 's', now + 100, { kind: 'refilled', apptId: freed.id, offerId: offer.id });
  return n;
}

export function staffMessage(s, p, body, now) {
  p.unread = false;
  return addMessage(s, { patientId: p.id, dir: 'out', author: 'staff', kind: 'staff', body, at: iso(now) });
}

export function confirmByCall(s, appt, now) {
  appt.confirmedAt = iso(now);
  appt.confirmedBy = 'call';
  appt.status = 'confirmed';
  appt.calledAt = iso(now);
  appt.callOutcome = 'confirmed';
  note(s, appt.patientId, 'Confirmed on a call by the front desk', now, { kind: 'confirm', apptId: appt.id });
}

export function logCall(s, appt, outcome, now) {
  appt.calledAt = iso(now);
  appt.callOutcome = outcome;
  note(s, appt.patientId, outcome === 'voicemail' ? 'Front desk left a voicemail' : 'Front desk called, no answer', now, { kind: 'call', apptId: appt.id });
}

export function setOutcome(s, appt, status, now) {
  const p = patientById(s, appt.patientId);
  const was = appt.status;
  appt.status = status;
  appt.outcomeAt = iso(now);
  if (p && status === 'no_show' && was !== 'no_show') p.noShows += 1;
  if (p && status === 'completed' && was !== 'completed') p.visits += 1;
}

export function tick(s, now) {
  const due = s.queue.filter(q => q.at <= now).sort((a, b) => a.at - b.at);
  if (due.length) s.queue = s.queue.filter(q => q.at > now);
  for (const q of due) {
    const p = patientById(s, q.patientId);
    if (p) inbound(s, p.phone, q.body, q.at);
  }
  for (const o of s.offers) {
    if (o.status !== 'open' || Date.parse(o.expiresAt) > now) continue;
    o.status = 'expired';
    for (const c of o.candidates) {
      const w = s.waitlist.find(x => x.id === c.waitId);
      if (w && w.status === 'offered' && w.offerId === o.id) w.status = 'waiting';
    }
    const freed = apptById(s, o.apptId);
    if (freed && !freed.filledBy) backfill(s, freed, now);
  }
}

export function publicState(s, now) {
  return {
    settings: s.settings,
    patients: s.patients,
    appts: s.appts,
    waitlist: s.waitlist,
    offers: s.offers,
    messages: s.messages,
    queued: s.queue.length,
    serverNow: iso(now)
  };
}
