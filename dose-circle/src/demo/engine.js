export const MIN = 60000;
export const HOUR = 3600000;
export const DAY = 86400000;

export const DEFAULT_SETTINGS = {
  household: 'The Delgados',
  viewer: 'm1',
  textingNumber: '+18135550190',
  timezone: 'America/New_York',
  nudgeMinutes: 20,
  escalateMinutes: 45,
  backupMinutes: 90,
  missAfterMinutes: 180,
  quietStart: 22,
  quietEnd: 7,
  refillDays: 7,
  refillHour: 10,
  digestDay: 0,
  digestHour: 18,
  bpHighSys: 160,
  bpHighDia: 100,
  bpLowSys: 90,
  glucoseHigh: 250,
  glucoseLow: 70,
  weightGainDay: 3,
  weightGainWeek: 5,
  aiEnabled: true,
  demoMode: true,
  claudeModel: 'claude-opus-5',
  poisonControl: '1-800-222-1222',
  templateDose: 'Hi {first}, time for your {slot} pills:{list}Reply TAKEN when you’ve had them.',
  templateNudge: 'Just checking in, {first}. Did you take your {slot} pills? Reply TAKEN, or tell me what’s going on.',
  templateAlert: '{name} hasn’t confirmed {their} {slot} pills yet ({meds}). Could you give {them} a call? Reply DONE if {they} took them, or ON IT if you’re checking.',
  templateRefill: '{name}’s {med} has about {days} left, until {date}. Reply ORDERED once you’ve asked {pharmacy}, or PICKED UP when it’s home.'
};

export const SLOTS = [
  { key: 'morning', label: 'Morning', word: 'morning' },
  { key: 'midday', label: 'Lunchtime', word: 'lunchtime' },
  { key: 'evening', label: 'Evening', word: 'evening' },
  { key: 'bedtime', label: 'Bedtime', word: 'bedtime' }
];

let ZONE = null;
const FMT = {};
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const setZone = z => {
  ZONE = z || null;
};

export const zoned = o => (ZONE ? { ...o, timeZone: ZONE } : o);

export function parts(t) {
  const d = new Date(t);
  if (!ZONE) return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), wd: d.getDay() };
  const f = FMT[ZONE] || (FMT[ZONE] = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }));
  const o = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month - 1, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: WD.indexOf(o.weekday) };
}

export function make(y, mo, d, h = 0, mi = 0) {
  if (!ZONE) return new Date(y, mo, d, h, mi, 0, 0).getTime();
  const want = Date.UTC(y, mo, d, h, mi);
  let guess = want;
  for (let i = 0; i < 3; i++) {
    const p = parts(guess);
    guess -= Date.UTC(p.y, p.mo, p.d, p.h, p.mi) - want;
  }
  return guess;
}

export const hourOf = t => parts(t).h;
export const weekdayOf = t => parts(t).wd;

export const dayStart = t => {
  const p = parts(t);
  return make(p.y, p.mo, p.d);
};

export const addDays = (t, n) => {
  const p = parts(t);
  return make(p.y, p.mo, p.d + n, p.h, p.mi);
};

export const atTime = (day, h, m = 0) => {
  const p = parts(day);
  return make(p.y, p.mo, p.d, h, m);
};

export const timeLabel = t => new Date(t).toLocaleTimeString('en-US', zoned({ hour: 'numeric', minute: '2-digit' }));
export const shortTime = t => timeLabel(t).replace(':00', '').replace(' AM', 'am').replace(' PM', 'pm');

export function dayLabel(t, now = Date.now()) {
  const d = dayStart(t);
  const today = dayStart(now);
  if (d === today) return 'today';
  if (d === addDays(today, 1)) return 'tomorrow';
  if (d === addDays(today, -1)) return 'yesterday';
  return new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'short', month: 'short', day: 'numeric' }));
}

export const dateLabel = t => new Date(t).toLocaleDateString('en-US', zoned({ weekday: 'short', month: 'short', day: 'numeric' }));

export const NL = String.fromCharCode(10);
const WS = new RegExp('[' + String.fromCharCode(32, 9, 10, 13, 160) + ']+', 'g');

export const firstName = name => String(name || '').trim().split(WS)[0] || 'there';

export function fill(template, vars) {
  return String(template || '').replace(/[{]([a-zA-Z0-9_]+)[}]/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

export const slotOf = key => SLOTS.find(x => x.key === key) || SLOTS[0];

export function slotAt(person, slot, day) {
  const hm = String((person.schedule || {})[slot] || '08:00').split(':');
  return atTime(day, Number(hm[0]) || 0, Number(hm[1]) || 0);
}

export function perDay(med) {
  return Object.values(med.doses || {}).reduce((a, b) => a + Number(b || 0), 0);
}

export function daysLeft(med) {
  const d = perDay(med);
  return d ? Math.floor(Number(med.supply || 0) / d) : 999;
}

export function pillPhrase(med) {
  const p = med.pill || {};
  const size = p.size === 'large' ? 'big ' : p.size === 'small' ? 'small ' : '';
  const color = p.color2 ? p.color + ' and ' + p.color2 : p.color || '';
  if (p.shape === 'capsule' || p.shape === 'softgel') return 'the ' + size + color + ' ' + p.shape;
  return 'the ' + size + color + (p.shape ? ' ' + p.shape : '') + ' one';
}

export function medLabel(med) {
  return med.name + ' ' + med.strength;
}

const QUOTES = new RegExp('[' + String.fromCharCode(8217, 8216, 39, 96) + ']', 'g');
const norm = text => String(text || '').toLowerCase().replace(QUOTES, '').replace(/[^a-z0-9/.?!:%+ -]/g, ' ').replace(WS, ' ').trim();

const COUNTS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, 'a few': 3, 'a couple': 2, couple: 2, few: 3 };

export function readReadings(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/,/g, ' ') + ' ';
  const out = [];
  const bp = t.match(/([0-9]{2,3}) *(?:[/]|over) *([0-9]{2,3})/);
  if (bp) {
    const sys = Number(bp[1]);
    const dia = Number(bp[2]);
    if (sys >= 70 && sys <= 260 && dia >= 35 && dia <= 160 && sys > dia) {
      const pulse = t.match(/(?:pulse|heart rate|hr)[^0-9]{0,8}([0-9]{2,3})/) || t.match(/([0-9]{2,3}) *bpm/);
      out.push({ type: 'bp', sys, dia, pulse: pulse ? Number(pulse[1]) : null });
    }
  }
  const sugar = t.match(/(?:sugar|glucose|bg|bs|blood sugar|reading was)[^0-9/]{0,14}([0-9]{2,3})(?![0-9]* *[/])/);
  if (sugar) {
    const v = Number(sugar[1]);
    if (v >= 30 && v <= 600) out.push({ type: 'glucose', value: v });
  }
  const w = t.match(/(?:weigh|weight|weighed|scale)[^0-9]{0,14}([0-9]{2,3}(?:[.][0-9])?)/) || t.match(/([0-9]{2,3}(?:[.][0-9])?) *(?:lb|lbs|pounds)(?![a-z])/);
  if (w) {
    const v = Number(w[1]);
    if (v >= 70 && v <= 450) out.push({ type: 'weight', value: v });
  }
  return out;
}

const PURPOSE_WORDS = {
  'blood pressure': ['pressure', 'bp pill', 'blood pressure'],
  'blood sugar': ['sugar pill', 'diabetes', 'sugar one', 'sugar'],
  cholesterol: ['cholesterol', 'statin'],
  thyroid: ['thyroid'],
  vitamin: ['vitamin', 'vit d'],
  'fluid build-up': ['water pill', 'water one', 'fluid'],
  'heart rate': ['heart pill', 'heart one', 'heart'],
  'blood thinner': ['thinner', 'blood thinner'],
  prostate: ['prostate', 'bladder'],
  'heart protection': ['aspirin', 'baby aspirin']
};

export function matchMeds(text, meds) {
  const t = ' ' + norm(text) + ' ';
  const scored = meds.map(m => {
    let score = 0;
    const name = m.name.toLowerCase();
    if (t.includes(name) || t.includes(' ' + name.slice(0, 5))) score += 12;
    for (const w of PURPOSE_WORDS[m.purpose] || []) if (t.includes(w)) score += 7;
    const p = m.pill || {};
    if (p.color && t.includes(' ' + p.color)) score += 3;
    if (p.color2 && t.includes(' ' + p.color2)) score += 2;
    if (p.shape && t.includes(' ' + p.shape)) score += 2;
    if (p.shape === 'softgel' && /(gel|soft one|jelly)/.test(t)) score += 2;
    if (p.size === 'large' && /( big | large | huge | horse )/.test(t)) score += 2;
    if (p.size === 'small' && /( small | little | tiny )/.test(t)) score += 2;
    return { m, score };
  }).filter(x => x.score > 0);
  if (!scored.length) return [];
  const top = Math.max(...scored.map(x => x.score));
  return scored.filter(x => x.score === top).map(x => x.m.id);
}

const EMERGENCY = /(chest (pain|hurts|is tight|feels tight|feels heavy|pressure|tight)|tight chest|pain in my chest|cant breathe|can not breathe|cannot breathe|hard to breathe|short of breath|trouble breathing|struggling to breathe|i fell|fell down|fell over|have fallen|had a fall|on the floor|cant get up|face (is )?drooping|face droop|slurred|slurring|cant (move|feel) my (arm|leg|face)|numb on one side|one side (is )?numb|passed out|fainted|blacked out|unconscious|seizure|bleeding (a lot|badly|wont stop)|stroke|heart attack|call 911|ambulance|worst headache|severe pain)/;
const FALL = /(i fell|fell down|fell over|have fallen|had a fall|on the floor|cant get up)/;
const DOUBLE = /(took (them |it |my [a-z]+ )?(twice|two times|double|again by mistake)|double dose|took (too many|extra|an extra|two of)|took (toms|tomas|his|her|someone elses|the wrong) (pills|meds|tablets)|took (the )?(evening|night|bedtime|morning) ones (by mistake|instead))/;
const SYMPTOM = /(dizzy|dizziness|light ?headed|woozy|nause|queasy|feel sick|feeling sick|vomit|throwing up|threw up|headache|head hurts|tired|exhausted|weak|wobbly|unsteady|swollen|swelling|puffy|rash|itchy|itching|cough|fever|chills|pain|hurts|hurting|aching|sore|cant sleep|diarrh|constipat|blurry|shaky|shaking|upset stomach|upsets my stomach|stomach (ache|hurts|upset)|heartburn|makes me (feel )?(sick|dizzy|tired|funny|weird|queasy)|side effect|not feeling (well|good|great|myself)|feel (awful|terrible|bad|funny|off|unwell|strange)|confused|bruis)/;
const TAKEN = /(?<![a-z])(took|taken|had (them|my|the|it|em|all)|swallowed|done|did (them|it|my)|got (them|it) down|finished|all good|taking (them |it |em |my pills )?now|have taken)(?![a-z])/;
const YES = /^(y|yes|yep|yeah|yup|ok|okay|k|done|taken|took|took them|took em|took it|all done|yes done|yes taken|yes thank you|yes thanks|ok done|thumbs up|👍|✅|✔️|✔)$/;
const EXCEPT = /(except|but not|but the|but i didnt|but didnt|but i did not|apart from|other than|minus|skipped the|left out|forgot the|without the|not the)/;
const NOT_YET = /(not yet|havent|have not|didnt take|did not take|forgot|forget)/;
const LATER = /(not yet|in a (bit|minute|min|few|while|sec)|later|after (lunch|breakfast|dinner|supper|i eat|my|church|the|this|i get)|when i get (home|back|up)|give me|remind me|soon|about to|eating first|in [0-9]+ ?(min|mins|minutes|hour|hours|hr|hrs)|in (half|an) (an )?hour)/;
const NOW = /(taking (them|it|em)? ?now|take (them|it|em) now|will take (them|it) now|doing it now|now)/;
const SKIP = /(skip|skipping|not taking|wont take|dont want to take|not going to take|doctor (said|told me|wants me) to (stop|skip|hold|pause)|stopped taking|holding off|told to stop|leaving out)/;
const OUT = /(ran out|run out|out of|none left|no more|all gone|used the last)/;
const LOW = /(only ([0-9]+|one|two|three|four|five|six|seven|a few|a couple)( [a-z]+){0,5} left|([0-9]+) left|running (low|out)|almost (out|gone)|last (one|pill|few|couple)|need (a )?refill|need more|getting low|nearly out)/;
const QUESTION = /(what (is|are|s) (the|my|this|that)|whats (the|my|this|that)|what .* for|which (one|pill)|when do i|do i take|how many|should i|can i (take|have|eat|drink|skip)|is it (ok|okay|safe|alright)|grapefruit|alcohol|wine|[?])/;
const ADVICE = /(should i|can i (take|have|eat|drink|skip)|is it (ok|okay|safe|alright)|grapefruit|alcohol|wine|instead|double up|make up for)/;
const CALLBACK = /(call me|give me a call|ring me|can (ana|marco|june|someone|somebody|you) call|tell (ana|marco|june|my daughter|my son)|talk to (someone|somebody|ana|marco)|lonely|need help|come over|visit me)/;
const THANKS = /(thank|thanks|thx|bless you|love you|appreciate)/;

export function readCare(text, meds = []) {
  const raw = String(text || '');
  const t = ' ' + norm(raw) + ' ';
  const bare = t.trim().replace(/[.!]+$/, '');
  const out = { dose: null, missed: [], laterMinutes: null, reason: '', readings: readReadings(raw), concern: null, fall: false, low: [], question: false, advice: false, callback: false, thanks: false, stop: false, start: false };
  if (/^(stop|unsubscribe|stopall|quit|end|cancel)$/.test(bare)) {
    out.stop = true;
    return out;
  }
  if (/^(start|unstop)$/.test(bare)) {
    out.start = true;
    return out;
  }
  if (EMERGENCY.test(t) || bare === 'help' || bare === 'help me') {
    out.concern = 'emergency';
    out.fall = FALL.test(t);
  } else if (DOUBLE.test(t)) out.concern = 'double';
  else if (SYMPTOM.test(t)) out.concern = 'symptom';

  const lowHit = OUT.test(t) || LOW.test(t);
  if (lowHit) {
    const ids = matchMeds(raw, meds);
    const num = t.match(/(?:only )?([0-9]+|one|two|three|four|five|six|seven|a few|a couple) ([a-z]+ ){0,5}left/);
    let count = OUT.test(t) ? 0 : null;
    if (num) count = /^[0-9]+$/.test(num[1]) ? Number(num[1]) : COUNTS[num[1]] || null;
    out.low = ids.length ? ids.map(id => ({ medId: id, count })) : [{ medId: null, count }];
  }

  const takenWord = TAKEN.test(t) || YES.test(bare);
  if (out.concern === 'double') out.dose = 'taken';
  else if (EXCEPT.test(t) && takenWord) {
    const seg = t.slice(t.search(EXCEPT));
    out.missed = matchMeds(seg, meds);
    out.dose = out.missed.length ? 'partial' : 'taken';
  } else if (SKIP.test(t) || (OUT.test(t) && !takenWord)) {
    const ids = matchMeds(raw, meds);
    out.missed = ids;
    out.dose = ids.length && ids.length < meds.length ? 'partial' : 'skipped';
  } else if (OUT.test(t) && takenWord) {
    const ids = out.low.map(l => l.medId).filter(Boolean);
    out.missed = ids;
    out.dose = ids.length ? 'partial' : 'taken';
  } else if (NOT_YET.test(t) && NOW.test(t)) out.dose = 'taken';
  else if (LATER.test(t) || NOT_YET.test(t)) {
    out.dose = 'later';
    const m = t.match(/in ([0-9]+) ?(min|mins|minutes|hour|hours|hr|hrs)/);
    if (m) out.laterMinutes = /^h/.test(m[2]) ? Number(m[1]) * 60 : Number(m[1]);
    else if (/half an hour|in half/.test(t)) out.laterMinutes = 30;
    else if (/an hour/.test(t)) out.laterMinutes = 60;
    else if (/after (lunch|breakfast|dinner|supper|i eat)|eating first/.test(t)) out.laterMinutes = 45;
    else out.laterMinutes = 30;
  } else if (takenWord) out.dose = 'taken';

  if (out.dose === 'partial' || out.dose === 'skipped') {
    const why = raw.match(/(?<![a-zA-Z])(because|cause|cuz|it|they|makes|doctor|dr)(?![a-zA-Z])[^.!?]*/i);
    out.reason = why ? why[0].trim().slice(0, 120) : '';
  }
  out.question = QUESTION.test(t) && !out.dose;
  out.advice = ADVICE.test(t);
  out.callback = CALLBACK.test(t);
  out.thanks = THANKS.test(t);
  return out;
}

export function readFamily(text) {
  const t = ' ' + norm(text) + ' ';
  const bare = t.trim().replace(/[.!]+$/, '');
  if (/^(stop|unsubscribe|stopall|quit|end)$/.test(bare)) return 'stop';
  if (/^(start|unstop)$/.test(bare)) return 'start';
  if (/(picked up|got (the|her|his|mom|dad|moms|dads) (refill|pills|meds|prescription)|refilled|have the refill|its home|collected)/.test(t)) return 'picked';
  if (/(ordered|called (the )?pharmacy|requested|refill (is )?(in|requested|ordered)|put in (the|a) refill|on order)/.test(t)) return 'ordered';
  if (/^(done|taken|yes)$/.test(bare) || /((she|he|mom|dad) (took|had|has taken|did)|took them|(shes|hes|she is|he is) (fine|ok|okay|good)|all good|confirmed|(she|he)s taken)/.test(t)) return 'done';
  if (/(status|how is|hows|how are|update|summary|report|did (mom|dad|she|he)|today)/.test(t)) return 'status';
  if (/(on it|calling|ill call|i will call|will call|checking|heading (over|there)|on my way|going over|got it|will check|call (her|him) now|911|^ok$|^okay$|^thanks)/.test(t) || /^(ok|okay|k|thanks|thank you)$/.test(bare)) return 'ack';
  return 'other';
}

export const DOSE_STATUS = {
  scheduled: { label: 'Coming up', tone: 'quiet' },
  due: { label: 'Waiting for reply', tone: 'due' },
  taken: { label: 'Taken', tone: 'good' },
  partial: { label: 'Partly taken', tone: 'warn' },
  skipped: { label: 'Skipped', tone: 'muted' },
  missed: { label: 'Missed', tone: 'bad' }
};

export const ALERT_KIND = {
  missed: { label: 'No reply to a dose', tone: 'warn' },
  emergency: { label: 'Possible emergency', tone: 'bad' },
  double: { label: 'Took an extra dose', tone: 'bad' },
  symptom: { label: 'Not feeling well', tone: 'warn' },
  reading: { label: 'Reading outside limits', tone: 'warn' },
  refill: { label: 'Refill needed', tone: 'blue' },
  callback: { label: 'Asked for a call', tone: 'violet' },
  question: { label: 'Asked a question', tone: 'violet' },
  partial: { label: 'Skipped a medicine', tone: 'quiet' }
};

export function phoneLabel(p) {
  const d = String(p || '').replace(/[^0-9]/g, '').replace(/^1(?=[0-9]{10}$)/, '');
  if (d.length !== 10) return p || '';
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}

export function readingLabel(r) {
  if (r.type === 'bp') return r.sys + '/' + r.dia + (r.pulse ? ', pulse ' + r.pulse : '');
  if (r.type === 'glucose') return r.value + ' mg/dL';
  if (r.type === 'weight') return r.value + ' lb';
  return String(r.value);
}

export const READING_NAME = { bp: 'Blood pressure', glucose: 'Blood sugar', weight: 'Weight' };
