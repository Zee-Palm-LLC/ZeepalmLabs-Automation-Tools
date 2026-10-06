import { DEFAULT_SETTINGS, MIN, HOUR, DAY, dayStart, addDays, atTime, isWorkday, nextWorkday, fitsHours, busy, typeOf, riskOf, openSlots, hourOf, zoned } from './engine.js';
import { emptyState, uid, addMessage, note, sendReminder, inbound, cancelAppt, patientById, tick } from './desk.js';

const FIRST = ['Ava', 'Marcus', 'Priya', 'Diego', 'Hannah', 'Owen', 'Grace', 'Malik', 'Sofia', 'Ethan', 'Leah', 'Noah', 'Isabel', 'Caleb', 'Mei', 'Jonah', 'Rosa', 'Tyler', 'Amara', 'Lucas', 'Chloe', 'Andre', 'Nina', 'Ben', 'Fatima', 'Ryan', 'Elena', 'Jamal', 'Clara', 'Henry', 'Yusuf', 'Maya', 'Derek', 'Ines', 'Theo', 'Keisha', 'Sam', 'Lily', 'Victor', 'Zoe', 'Omar', 'Paige', 'Arjun', 'Tessa', 'Wes', 'Carmen', 'Felix', 'Dana', 'Kofi', 'Ruth'];
const LAST = ['Bell', 'Kim', 'Pratt', 'Delgado', 'Nguyen', 'Shah', 'Okoro', 'Russo', 'Fischer', 'Lopez', 'Hayes', 'Brennan', 'Moreno', 'Adler', 'Chen', 'Walsh', 'Ibrahim', 'Turner', 'Sato', 'Novak', 'Reid', 'Haddad', 'Foster', 'Silva', 'Murphy', 'Larsen', 'Grant', 'Mensah', 'Price', 'Ortiz', 'Kowalski', 'Byrne', 'Rahman', 'Doyle', 'Vargas', 'Quinn', 'Petrov', 'Hart', 'Molina', 'Ellis'];
const AREAS = ['512', '737', '210', '830', '254'];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = t => new Date(t).toISOString();
const CONFIRMS = ['C', 'c', 'Confirm', 'Confirmed, thanks!', 'Yes', 'C thanks', 'Yep see you then', 'c', 'Confirmed', 'Yes I’ll be there'];

export function buildDemo(now, settings = DEFAULT_SETTINGS) {
  const s = emptyState(settings);
  const S = s.settings;
  const r = rng(20261006);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const between = (a, b) => a + r() * (b - a);
  const today = dayStart(now);
  const inHours = isWorkday(now) && hourOf(now) >= S.openHour && hourOf(now) < S.closeHour - 1;

  const phones = new Set([S.clinicPhone, S.frontDeskPhone]);
  const usedNames = new Set();
  const makePhone = () => {
    for (;;) {
      const p = '+1' + pick(AREAS) + '55501' + String(Math.floor(r() * 100)).padStart(2, '0');
      if (!phones.has(p)) {
        phones.add(p);
        return p;
      }
    }
  };
  const makeName = () => {
    for (;;) {
      const n = pick(FIRST) + ' ' + pick(LAST);
      if (!usedNames.has(n)) {
        usedNames.add(n);
        return n;
      }
    }
  };
  const addPatient = (name, extra = {}) => {
    const roll = r();
    const p = {
      id: uid(s, 'p'),
      name: name || makeName(),
      phone: makePhone(),
      since: iso(now - between(20, 2400) * DAY),
      visits: r() < 0.12 ? 0 : Math.floor(between(1, 16)),
      noShows: roll < 0.7 ? 0 : roll < 0.9 ? 1 : roll < 0.98 ? 2 : 3,
      lateCancels: r() < 0.82 ? 0 : 1,
      optedOut: false,
      aiPaused: false,
      flag: null,
      pending: null,
      lastReplyAt: null,
      unread: false,
      ...extra
    };
    if (name) usedNames.add(name);
    s.patients.push(p);
    return p;
  };

  const scripted = {
    marcus: addPatient('Marcus Bell', { visits: 7, noShows: 0, lateCancels: 0 }),
    rosa: addPatient('Rosa Delgado', { visits: 4, noShows: 0 }),
    priya: addPatient('Priya Shah', { visits: 2, noShows: 1 }),
    owen: addPatient('Owen Pratt', { visits: 5, noShows: 0 }),
    grace: addPatient('Grace Kim', { visits: 9, noShows: 0 }),
    diego: addPatient('Diego Moreno', { visits: 3, noShows: 1, lateCancels: 1 }),
    hannah: addPatient('Hannah Walsh', { visits: 6, noShows: 0 }),
    tyler: addPatient('Tyler Novak', { visits: 1, noShows: 2 }),
    elena: addPatient('Elena Russo', { visits: 11, noShows: 0 }),
    jamal: addPatient('Jamal Reid', { visits: 0, noShows: 0 })
  };
  for (let i = 0; i < 150; i++) addPatient();
  const pool = s.patients.filter(p => !Object.values(scripted).includes(p));

  const addAppt = (patient, provider, type, start, extra = {}) => {
    const t = typeOf(S, type);
    const a = {
      id: uid(s, 'a'),
      patientId: patient.id,
      provider,
      type,
      start: iso(start),
      minutes: t.minutes,
      value: t.value,
      status: 'booked',
      bookedAt: iso(start - between(3, 45) * DAY),
      reminders: {},
      confirmedAt: null,
      confirmedBy: null,
      source: r() < 0.7 ? 'phone' : 'online',
      replyIntent: null,
      ...extra
    };
    if (Date.parse(a.bookedAt) > now) a.bookedAt = iso(now - between(1, 40) * HOUR);
    s.appts.push(a);
    return a;
  };

  const waitAdd = (patient, type, extra = {}) => {
    const w = { id: uid(s, 'w'), patientId: patient.id, type, provider: 'any', window: 'any', days: null, addedAt: iso(now - between(1, 26) * DAY), status: 'waiting', priority: false, note: '', offerId: null, apptId: null, ...extra };
    s.waitlist.push(w);
    return w;
  };

  const tomorrow = nextWorkday(now, 1);
  const dayAfter = nextWorkday(now, 2);
  const res = {
    marcus: addAppt(scripted.marcus, 'reyes', 'cleaning', atTime(tomorrow, 9), { bookedAt: iso(now - 41 * DAY) }),
    rosa: addAppt(scripted.rosa, 'patel', 'filling', atTime(tomorrow, 14), { bookedAt: iso(now - 9 * DAY) }),
    priya: addAppt(scripted.priya, 'okafor', 'crown', atTime(tomorrow, 10), { bookedAt: iso(now - 23 * DAY) }),
    diego: addAppt(scripted.diego, 'reyes', 'cleaning', atTime(dayAfter, 15), { bookedAt: iso(now - 52 * DAY) }),
    tyler: addAppt(scripted.tyler, 'okafor', 'filling', atTime(tomorrow, 8), { bookedAt: iso(now - 33 * DAY) }),
    jamal: addAppt(scripted.jamal, 'patel', 'exam', atTime(tomorrow, 11), { bookedAt: iso(now - 30 * DAY) }),
    hannah: addAppt(scripted.hannah, 'patel', 'whitening', atTime(dayAfter, 9), { bookedAt: iso(now - 15 * DAY) })
  };

  const WEIGHTS = [['exam', 16], ['filling', 30], ['crown', 12], ['rootcanal', 7], ['whitening', 9], ['emergency', 6]];
  const total = WEIGHTS.reduce((a, b) => a + b[1], 0);
  const dentistType = () => {
    let x = r() * total;
    for (const [k, w] of WEIGHTS) {
      x -= w;
      if (x <= 0) return k;
    }
    return 'filling';
  };

  const keep = new Set([atTime(dayAfter, 13), atTime(dayAfter, 16)]);
  const history = [];
  for (let d = -30; d <= 13; d++) {
    const day = addDays(today, d);
    if (!isWorkday(day)) continue;
    const fillP = d <= 0 ? 0.9 : Math.max(0.34, 0.93 - 0.05 * d);
    const usedToday = new Set(s.appts.filter(a => dayStart(Date.parse(a.start)) === day).map(a => a.patientId));
    const who = () => {
      for (let k = 0; k < 50; k++) {
        const p = pick(pool);
        if (!usedToday.has(p.id)) {
          usedToday.add(p.id);
          return p;
        }
      }
      return pick(pool);
    };
    for (const p of S.providers) {
      let h = S.openHour;
      while (h < S.closeHour) {
        if (h >= S.lunchHour && h < S.lunchHour + 1) {
          h = S.lunchHour + 1;
          continue;
        }
        const type = p.role === 'hygienist' ? 'cleaning' : dentistType();
        const t = typeOf(S, type);
        const start = atTime(day, Math.floor(h), h % 1 ? 30 : 0);
        if (p.role === 'hygienist' && keep.has(start)) {
          h += 1;
          continue;
        }
        if (r() < fillP && fitsHours(S, start, t.minutes) && !busy(s.appts, p.key, start, t.minutes)) {
          if (type === 'emergency' && d > 2) {
            h += 0.5;
            continue;
          }
          const lead = type === 'emergency' ? between(0.1, 1.5) : r() < 0.4 ? between(2, 13) : r() < 0.6 ? between(14, 35) : between(36, 90);
          history.push(addAppt(who(), p.key, type, start, { bookedAt: iso(Math.min(start - lead * DAY, now - between(1, 30) * HOUR)) }));
          h += t.minutes / 60;
        } else {
          h += p.role === 'hygienist' ? 1 : r() < 0.5 ? 0.5 : 1;
        }
      }
    }
  }

  const refill = (freed, at) => {
    const freedP = patientById(s, freed.patientId);
    const role = S.providers.find(x => x.key === freed.provider).role;
    const types = S.types.filter(t => t.role === role && t.minutes <= freed.minutes && t.key !== 'emergency');
    if (!types.length) return null;
    const t = pick(types);
    const winner = pick(pool.filter(p => p !== freedP));
    const sentAt = at + 60000;
    const filledAt = sentAt + between(40, 900) * 1000;
    const w = { id: uid(s, 'w'), patientId: winner.id, type: t.key, provider: 'any', window: 'any', days: null, addedAt: iso(at - between(2, 30) * DAY), status: 'booked', priority: false, note: '', offerId: null, apptId: null, bookedAt: iso(filledAt) };
    s.waitlist.push(w);
    const n = {
      id: uid(s, 'a'), patientId: winner.id, provider: freed.provider, type: t.key, start: freed.start, minutes: t.minutes, value: t.value,
      status: 'booked', bookedAt: iso(filledAt), reminders: {}, confirmedAt: iso(filledAt), confirmedBy: 'offer', source: 'waitlist', fromAppt: freed.id, replyIntent: 'accept'
    };
    if (Date.parse(n.start) + n.minutes * MIN <= now) {
      n.status = r() < 0.97 ? 'completed' : 'no_show';
      n.outcomeAt = iso(Date.parse(n.start) + n.minutes * MIN);
    } else if (Date.parse(n.start) <= now) n.status = 'arrived';
    else n.status = 'confirmed';
    s.appts.push(n);
    w.apptId = n.id;
    const others = [pick(pool), pick(pool)].filter(p => p !== winner && p !== freedP);
    const cands = [{ waitId: w.id, patientId: winner.id, score: Math.round(between(62, 88)), reasons: [], reply: 'yes', replyAt: iso(filledAt) }]
      .concat(others.map((p, i) => ({ waitId: null, patientId: p.id, score: Math.round(between(44, 61)), reasons: [], reply: i === 0 && r() < 0.5 ? 'late' : null, replyAt: i === 0 ? iso(filledAt + between(30, 400) * 1000) : null })));
    const offer = { id: uid(s, 'o'), apptId: freed.id, provider: freed.provider, start: freed.start, minutes: freed.minutes, reason: freed.status, sentAt: iso(sentAt), expiresAt: iso(sentAt + S.offerMinutes * MIN), status: 'filled', filledAt: iso(filledAt), winner: w.id, newApptId: n.id, value: t.value, candidates: cands };
    w.offerId = offer.id;
    s.offers.push(offer);
    freed.offerId = offer.id;
    freed.filledBy = n.id;
    return n;
  };

  const later = [];
  for (const a of history) {
    const p = patientById(s, a.patientId);
    const start = Date.parse(a.start);
    const booked = Date.parse(a.bookedAt);
    const r0 = riskOf(a, p, start - DAY, S).score;
    const first = start - S.reminderFirst * HOUR;
    const second = start - S.reminderSecond * HOUR;
    if (first > booked && first <= now) a.reminders.first = iso(first);
    if (second > booked && second <= now) a.reminders.second = iso(second);
    const reminded = a.reminders.second || a.reminders.first;
    const roll = r();
    const remindAt = Date.parse(reminded || a.bookedAt);
    if (reminded && roll < 0.045 && start - now > -30 * DAY) {
      const at = Math.min(now - 5 * MIN, remindAt + between(0.2, 20) * HOUR);
      if (at < start - 2 * HOUR) {
        a.status = 'cancelled';
        a.cancelledAt = iso(at);
        a.cancelledBy = 'text';
        a.replyIntent = 'cancel';
        if (r() < 0.78) later.push(() => refill(a, at));
        continue;
      }
    }
    if (reminded && roll >= 0.045 && roll < 0.11) {
      const at = Math.min(now - 5 * MIN, remindAt + between(0.2, 12) * HOUR);
      if (at < start - 2 * HOUR) {
        const slots = openSlots(s, { minutes: a.minutes, providers: [a.provider], days: [nextWorkday(start, 1 + Math.floor(r() * 4))], now: at, limit: 2 });
        if (slots.length) {
          const n = { ...a, id: uid(s, 'a'), start: slots[0].start, status: 'confirmed', confirmedAt: iso(at), confirmedBy: 'move', bookedAt: iso(at), reminders: {}, movedFrom: a.id, source: 'text', replyIntent: null };
          s.appts.push(n);
          a.status = 'moved';
          a.cancelledAt = iso(at);
          a.movedTo = n.id;
          a.replyIntent = 'reschedule';
          if (Date.parse(n.start) < now) n.status = r() < 0.97 ? 'completed' : 'no_show';
          if (r() < 0.72) later.push(() => refill(a, at));
          continue;
        }
      }
    }
    if (reminded) {
      const pConfirm = Math.max(0.35, 0.93 - r0 / 220);
      if (r() < pConfirm) {
        const at = remindAt + between(2, 300) * MIN;
        if (at <= now) {
          a.confirmedAt = iso(at);
          a.confirmedBy = 'text';
          a.status = 'confirmed';
          const q = r();
          a.replyIntent = q < 0.04 ? 'question' : q < 0.06 ? 'late' : 'confirm';
        }
      } else if (r0 >= 45 && second <= now && r() < 0.55) {
        const at = second + between(3, 6) * HOUR;
        if (at <= now && at < start) {
          a.calledAt = iso(at);
          if (r() < 0.6) {
            a.confirmedAt = iso(at);
            a.confirmedBy = 'call';
            a.status = 'confirmed';
            a.callOutcome = 'confirmed';
          } else a.callOutcome = r() < 0.5 ? 'voicemail' : 'no_answer';
        }
      }
    }
    if (start + a.minutes * MIN <= now) {
      const pNo = a.confirmedAt ? 0.022 : 0.14 + r0 / 300;
      a.outcomeAt = iso(start + a.minutes * MIN);
      if (r() < pNo) {
        a.status = 'no_show';
        p.noShows += 1;
      } else {
        a.status = 'completed';
        p.visits += 1;
      }
    } else if (start <= now) {
      a.status = 'arrived';
    }
  }
  later.forEach(f => f());

  const types = ['cleaning', 'cleaning', 'cleaning', 'cleaning', 'cleaning', 'cleaning', 'filling', 'filling', 'filling', 'crown', 'exam', 'exam', 'whitening', 'rootcanal'];
  const windows = ['any', 'any', 'any', 'mornings', 'afternoons', 'late', 'any'];
  waitAdd(scripted.grace, 'cleaning', { addedAt: iso(now - 29 * DAY), note: 'Happy with any time, works from home' });
  waitAdd(scripted.owen, 'cleaning', { addedAt: iso(now - 27 * DAY), window: 'any' });
  waitAdd(scripted.elena, 'cleaning', { addedAt: iso(now - 8 * DAY), window: 'mornings' });
  const waitPool = pool.filter(p => !s.waitlist.some(w => w.patientId === p.id) && p.noShows < 2);
  for (let i = 0; i < 13; i++) {
    const p = waitPool[(i * 7 + 3) % waitPool.length];
    if (s.waitlist.some(w => w.patientId === p.id)) continue;
    const t = types[i % types.length];
    const prov = t === 'cleaning' ? 'any' : r() < 0.4 ? pick(['patel', 'okafor']) : 'any';
    waitAdd(p, t, { window: pick(windows), provider: prov, days: r() < 0.2 ? [2, 4] : null, priority: t === 'crown' && i % 2 === 0, note: t === 'crown' ? 'Temporary crown, wants it done soon' : '' });
  }

  const recent = s.appts.filter(a => {
    const t = Date.parse(a.start);
    return t >= addDays(today, -2) && t < addDays(today, 4) && !Object.values(res).includes(a);
  });
  for (const a of recent) {
    const p = patientById(s, a.patientId);
    for (const kind of ['first', 'second']) {
      if (!a.reminders[kind]) continue;
      const tpl = kind === 'first' ? S.templateFirst : S.templateSecond;
      const at = Date.parse(a.reminders[kind]);
      const vars = { first: p.name.split(' ')[0], clinic: S.shortName, when: whenAt(a.start, at), time: timeOnly(a.start), provider: S.providers.find(x => x.key === a.provider).short, address: S.address };
      addMessage(s, { patientId: p.id, apptId: a.id, dir: 'out', author: 'ai', kind: 'reminder', body: tpl.replace(/[{]([a-zA-Z0-9_]+)[}]/g, (m, k) => vars[k] || m), at: iso(at) });
    }
    if (a.confirmedAt && a.confirmedBy === 'text') {
      const at = Date.parse(a.confirmedAt);
      addMessage(s, { patientId: p.id, apptId: a.id, dir: 'in', author: 'patient', body: pick(CONFIRMS), at: iso(at), intent: 'confirm' });
      addMessage(s, { patientId: p.id, apptId: a.id, dir: 'out', author: 'ai', kind: 'reply', body: 'Thanks, ' + p.name.split(' ')[0] + '. You’re confirmed for ' + whenAt(a.start, at) + ' with ' + S.providers.find(x => x.key === a.provider).short + '. Reply R if anything changes.', at: iso(at + 2400) });
      p.lastReplyAt = iso(at);
    }
    if (a.confirmedBy === 'call') note(s, p.id, 'Confirmed on a call by the front desk', Date.parse(a.calledAt), { kind: 'confirm', apptId: a.id });
    else if (a.callOutcome) note(s, p.id, a.callOutcome === 'voicemail' ? 'Front desk left a voicemail' : 'Front desk called, no answer', Date.parse(a.calledAt), { kind: 'call', apptId: a.id });
  }

  const remind = (a, at) => sendReminder(s, a, 'second', at);
  const ago = m => now - m * MIN;

  sendReminder(s, res.diego, 'first', ago(20 * 60));
  inbound(s, scripted.diego.phone, 'Need to cancel, something came up at work. Sorry!', ago(7 * 60));
  const dOffer = s.offers.find(o => o.apptId === res.diego.id);
  if (dOffer) inbound(s, patientById(s, dOffer.candidates[dOffer.candidates.length - 1].patientId).phone, 'Yes!', ago(7 * 60 - 3));

  let askDay = dayAfter;
  for (let i = 1; i <= 5; i++) {
    const d = nextWorkday(tomorrow, i);
    if (openSlots(s, { minutes: 60, providers: ['reyes'], days: [d], from: 13, to: 17, now, limit: 3 }).length >= 2) {
      askDay = d;
      break;
    }
  }
  remind(res.marcus, ago(260));
  inbound(s, scripted.marcus.phone, 'Can’t make it then, sorry. Anything on ' + weekdayName(askDay) + ' afternoon?', ago(170));
  inbound(s, scripted.marcus.phone, '2 works', ago(166));
  inbound(s, scripted.grace.phone, 'Yes please!', ago(164));
  inbound(s, scripted.owen.phone, 'yes', ago(161));

  remind(res.rosa, ago(300));
  inbound(s, scripted.rosa.phone, 'C', ago(280));
  inbound(s, scripted.rosa.phone, 'Also my tooth from the last filling is still throbbing at night. Is that normal?', ago(18));

  remind(res.priya, ago(240));
  inbound(s, scripted.priya.phone, 'Do you take Cigna? And is there parking?', ago(95));
  inbound(s, scripted.priya.phone, 'C', ago(92));

  remind(res.jamal, ago(250));
  inbound(s, scripted.jamal.phone, 'Can someone call me about my bill? I got charged twice.', ago(52));

  remind(res.tyler, ago(310));
  const hd = s.appts.find(a => a.id === res.hannah.id);
  sendReminder(s, hd, 'first', ago(26 * 60));
  inbound(s, scripted.hannah.phone, 'Confirmed, thank you!', ago(25 * 60));

  const optOut = pool[11];
  addMessage(s, { patientId: optOut.id, dir: 'in', author: 'patient', body: 'STOP', at: iso(ago(2 * 24 * 60)), intent: 'stop' });
  addMessage(s, { patientId: optOut.id, dir: 'out', author: 'ai', kind: 'reply', body: 'You’re unsubscribed from ' + S.shortName + ' texts. Reply START to opt back in.', at: iso(ago(2 * 24 * 60 - 0.05)) });
  optOut.optedOut = true;

  if (inHours) {
    const soon = s.appts.find(a => a.status === 'confirmed' && Date.parse(a.start) > now + 8 * MIN && Date.parse(a.start) < now + 70 * MIN);
    if (soon) {
      const p = patientById(s, soon.patientId);
      sendReminder(s, soon, 'final', Date.parse(soon.start) - 2 * HOUR);
      inbound(s, p.phone, 'Running about 10 min late, stuck in traffic. Sorry!', ago(6));
    }
  }

  const live = s.appts
    .filter(a => a.status === 'booked' && !Object.values(res).includes(a) && S.providers.find(x => x.key === a.provider).role === 'hygienist' && Date.parse(a.start) > now + 4 * HOUR && Date.parse(a.start) < now + 4 * DAY)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  if (live) {
    const lp = patientById(s, live.patientId);
    note(s, lp.id, 'Called the front desk to cancel', ago(4));
    const offer = cancelAppt(s, live, ago(4), 'desk');
    if (offer && offer.candidates[1]) s.queue.push({ at: now + 50000, patientId: offer.candidates[1].patientId, body: 'Yes I’ll take it' });
  }

  tick(s, now);
  for (const p of s.patients) p.unread = false;
  scripted.rosa.unread = true;
  scripted.jamal.unread = true;
  s.messages.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return s;
}

function whenAt(start, at) {
  const d = dayStart(Date.parse(start));
  const t = dayStart(at);
  const time = timeOnly(start);
  const wd = new Date(start).toLocaleDateString('en-US', zoned({ weekday: 'short', month: 'short', day: 'numeric' }));
  if (d === t) return 'today, ' + wd + ' at ' + time;
  if (d === addDays(t, 1)) return 'tomorrow, ' + wd + ' at ' + time;
  return wd + ' at ' + time;
}

function timeOnly(t) {
  return new Date(t).toLocaleTimeString('en-US', zoned({ hour: 'numeric', minute: '2-digit' }));
}

function weekdayName(t) {
  return new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'long' }));
}
