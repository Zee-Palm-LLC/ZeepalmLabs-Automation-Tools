import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Phone, Package, ArrowRight, ChatCircleDots, BellRinging, Sparkle, Drop, Heartbeat, Scales, Clock, Note } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Card, Tag, Avatar, Ring, Segmented, Empty } from '../components/ui.jsx';
import Pillbox, { SLOT_ICON } from '../components/Pillbox.jsx';
import { PillIcon } from '../components/Pill.jsx';
import DoseSheet from '../components/DoseSheet.jsx';
import { AlertIcon } from '../components/Shell.jsx';
import { today, weekOf, openAlerts, supply, adherence, personOf, memberOf, streak } from '../lib/metrics.js';
import { greeting, time, until, ago, pct, first, plural, shortDate } from '../lib/format.js';
import { ALERT_KIND, DAY, dayStart, slotOf, readingLabel, READING_NAME, medLabel } from '../demo/engine.js';

const READ_ICON = { bp: Heartbeat, glucose: Drop, weight: Scales };

export function callName(data, p) {
  const me = memberOf(data, data.settings.viewer);
  return (me && me.calls && me.calls[p.id]) || first(p.name);
}

function personLine(data, p, now) {
  const t = today(data, p.id, now);
  const name = callName(data, p);
  const pr = p.pronouns;
  if (t.open.length) return name + '’s ' + slotOf(t.open[0].slot).word + ' pills are waiting for a reply.';
  if (t.missed.length) return name + ' missed ' + pr.their + ' ' + slotOf(t.missed[t.missed.length - 1].slot).word + ' pills.';
  if (t.taken.length && t.next && dayStart(Date.parse(t.next.due)) === dayStart(now)) return name + ' is all caught up, next at ' + time(t.next.due) + '.';
  if (t.taken.length) return name + ' took everything today.';
  return name + '’s first pills are at ' + (t.next ? time(t.next.due) : 'the usual time') + '.';
}

function PersonCard({ p, onOpen }) {
  const { data, now } = useCare();
  const t = today(data, p.id, now);
  const week = adherence(data, p.id, dayStart(now) - 7 * DAY, dayStart(now));
  const name = callName(data, p);
  const total = t.doses.length;
  const status = t.open.length ? { tone: 'due', label: 'Waiting' } : t.missed.length ? { tone: 'bad', label: 'Missed one' } : { tone: 'good', label: 'On track' };
  const days = streak(data, p.id, now);
  return (
    <article className="person">
      <header className="person-head">
        <Avatar who={p} size={46} />
        <div>
          <h3>{name}</h3>
          <span>{p.name}, {p.age}</span>
        </div>
        <Tag tone={status.tone}>{status.label}</Tag>
      </header>
      <div className="person-body">
        <Ring value={total ? t.taken.length / total : 0} size={78} stroke={8} tone={t.missed.length ? 'bad' : 'brand'}>
          <b>{t.taken.length}</b>
          <small>of {total}</small>
        </Ring>
        <div className="person-next">
          <span>{t.open.length ? 'Waiting on' : 'Next up'}</span>
          <strong>{t.open.length ? slotOf(t.open[0].slot).label + ' pills, due ' + time(t.open[0].due) : t.next ? slotOf(t.next.slot).label + ' pills at ' + time(t.next.due) : 'Nothing left today'}</strong>
          <em>{t.open.length ? 'Reminder sent ' + ago(t.open[0].remindedAt || t.open[0].due, now) : t.next ? until(t.next.due, now) : 'All done for today'}</em>
        </div>
      </div>
      <dl className="person-facts">
        <div>
          <dt>Past 7 days</dt>
          <dd>{pct(week.pct)}</dd>
          <em>{days > 1 ? days + ' full days in a row' : 'of doses taken'}</em>
        </div>
        {Object.values(t.latest).slice(0, 2).map(r => {
          const Icon = READ_ICON[r.type];
          return (
            <div key={r.type}>
              <dt><Icon size={13} weight="fill" /> {r.type === 'bp' ? 'Blood pressure' : r.type === 'glucose' ? 'Blood sugar' : 'Weight'}</dt>
              <dd className={r.flag ? 'is-flag' : ''}>{readingLabel(r).replace(' mg/dL', '')}</dd>
              <em>{ago(r.at, now)}</em>
            </div>
          );
        })}
      </dl>
      <ol className="person-day" aria-label="Today’s doses">
        {t.doses.map(d => {
          const Icon = SLOT_ICON[d.slot];
          return (
            <li key={d.id}>
              <button type="button" className={'day-chip st-' + d.status} onClick={() => onOpen(d)}>
                <Icon size={15} weight="duotone" />
                <span>{time(d.due)}</span>
                {d.status === 'taken' && <CheckCircle size={14} weight="fill" />}
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export function AlertCard({ a, compact }) {
  const { data, now, act, busy } = useCare();
  const p = personOf(data, a.personId);
  const kind = ALERT_KIND[a.kind] || { label: a.kind, tone: 'quiet' };
  const dose = a.doseId ? data.doses.find(d => d.id === a.doseId) : null;
  const refill = a.refillId ? data.refills.find(r => r.id === a.refillId) : null;
  const texted = a.members.map(id => memberOf(data, id)).filter(Boolean).map(m => first(m.name));
  const acker = a.ackBy ? memberOf(data, a.ackBy) : null;
  const they = p ? (p.pronouns.they === 'she' ? 'She' : p.pronouns.they === 'he' ? 'He' : 'They') : 'They';
  return (
    <motion.article layout className={'alert lvl-' + a.level + (a.ackAt ? ' is-seen' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }}>
      <span className="alert-icon"><AlertIcon kind={a.kind} /></span>
      <div className="alert-main">
        <div className="alert-top">
          <Tag tone={kind.tone} size="sm">{kind.label}</Tag>
          <time>{ago(a.at, now)}</time>
        </div>
        <h4>{a.title}</h4>
        {a.text && a.kind !== 'reading' && <blockquote>“{a.text}”</blockquote>}
        {a.kind === 'reading' && a.text && <p className="alert-note">{a.text}</p>}
        {!compact && (
          <p className="alert-who">
            {texted.length ? 'Texted ' + texted.join(', ') : 'Logged'}
            {acker ? ', ' + first(acker.name) + ' is on it' : ''}
          </p>
        )}
        <div className="alert-actions">
          {dose && dose.status === 'due' && (
            <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => act('mark', { dose: dose.id, status: 'taken' }, 'Marked as taken')}>
              <CheckCircle size={15} weight="fill" /> {they} took them
            </button>
          )}
          {refill && refill.status === 'needed' && (
            <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => act('refill', { refill: refill.id, status: 'ordered' }, 'Marked as ordered')}>
              <Package size={15} weight="fill" /> Ordered
            </button>
          )}
          {refill && refill.status !== 'picked' && (
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('refill', { refill: refill.id, status: 'picked' }, 'Added to the pill count')}>
              Picked up
            </button>
          )}
          {!refill && !a.ackAt && (
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('ack', { alert: a.id }, 'The others know you’re on it')}>
              <Phone size={15} weight="duotone" /> I’m on it
            </button>
          )}
          {!refill && !(dose && dose.status === 'due') && (
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('resolve', { alert: a.id }, 'Marked as handled')}>
              Mark handled
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function feedOf(data, now) {
  const start = dayStart(now);
  const out = [];
  for (const m of data.messages) {
    const at = Date.parse(m.at);
    if (at < start || at > now) continue;
    const p = personOf(data, m.thread);
    const mem = memberOf(data, m.thread);
    const who = p || mem;
    if (!who) continue;
    if (m.dir === 'in') out.push({ id: m.id, at, icon: ChatCircleDots, tone: m.intent === 'emergency' ? 'bad' : 'in', text: first(who.name) + ' replied', quote: m.body, intent: m.intent });
    else if (m.dir === 'note' && ['escalated', 'held', 'missed', 'urgent', 'snooze'].includes(m.kind)) out.push({ id: m.id, at, icon: Note, tone: 'note', text: m.body });
    else if (m.dir === 'out' && m.kind === 'dose') out.push({ id: m.id, at, icon: BellRinging, tone: 'out', text: 'Reminder sent to ' + first(who.name) });
    else if (m.dir === 'out' && m.kind === 'nudge') out.push({ id: m.id, at, icon: Clock, tone: 'out', text: 'Nudge sent to ' + first(who.name) });
    else if (m.dir === 'out' && mem && ['alert', 'refill', 'fyi'].includes(m.kind)) out.push({ id: m.id, at, icon: Sparkle, tone: 'fam', text: 'Texted ' + first(mem.name), quote: m.body });
  }
  return out.sort((a, b) => b.at - a.at);
}

const INTENT_TAG = { taken: ['Taken', 'good'], partial: ['Skipped one', 'warn'], skipped: ['Skipped', 'quiet'], later: ['Later', 'blue'], symptom: ['Not well', 'warn'], emergency: ['Urgent', 'bad'], double: ['Extra dose', 'bad'], low: ['Running low', 'blue'], reading: ['Reading', 'violet'], question: ['Question', 'violet'], callback: ['Wants a call', 'violet'], ack: ['On it', 'good'], done: ['Done', 'good'], ordered: ['Ordered', 'blue'], picked: ['Picked up', 'good'], status: ['Status', 'quiet'] };

export default function Today() {
  const { data, now } = useCare();
  const { person, setPerson } = useUi();
  const [open, setOpen] = useState(null);
  const me = memberOf(data, data.settings.viewer);
  const alerts = openAlerts(data);
  const needs = alerts.filter(a => !a.ackAt).length;
  const p = personOf(data, person) || data.people[0];
  const feed = feedOf(data, now).slice(0, 9);
  const low = supply(data).slice(0, 6);

  return (
    <div className="today">
      <section className="hello">
        <div>
          <h2>{greeting(now)}, {me ? first(me.name) : 'there'}.</h2>
          <p>
            {data.people.map(x => personLine(data, x, now)).join(' ')}{' '}
            <strong className={needs ? 'is-needs' : ''}>{needs ? plural(needs, 'thing needs', 'things need') + ' you.' : 'Nothing needs you right now.'}</strong>
          </p>
        </div>
      </section>

      <div className="today-grid">
        <div className="today-main">
          <div className="people">
            {data.people.map(x => <PersonCard key={x.id} p={x} onOpen={setOpen} />)}
          </div>
          <Card
            className="pillbox-card"
            title="This week’s pillbox"
            sub="Every dose, filled in as the replies come back."
            action={<Segmented size="sm" label="Whose pillbox" value={p.id} onChange={setPerson} options={data.people.map(x => ({ value: x.id, label: callName(data, x), icon: <Avatar who={x} size={18} /> }))} />}
          >
            <Pillbox person={p} days={weekOf(now)} now={now} onOpen={setOpen} />
            <div className="legend">
              <span><i className="lg lg-taken" /> Taken</span>
              <span><i className="lg lg-due" /> Waiting for a reply</span>
              <span><i className="lg lg-partial" /> Partly taken</span>
              <span><i className="lg lg-missed" /> Missed</span>
              <span><i className="lg lg-scheduled" /> Coming up</span>
            </div>
          </Card>
        </div>

        <aside className="today-side">
          <Card title="Needs the family" sub={alerts.length ? 'Newest and most urgent first' : undefined} className="needs-card">
            <div className="alerts">
              <AnimatePresence initial={false}>
                {alerts.map(a => <AlertCard key={a.id} a={a} />)}
              </AnimatePresence>
              {!alerts.length && <Empty icon={CheckCircle} title="Nothing needs you">Dose Circle will text you if a dose goes unanswered or something sounds wrong.</Empty>}
            </div>
          </Card>
          <Card title="Today so far" action={<Link to="/messages" className="link">All messages <ArrowRight size={14} weight="bold" /></Link>}>
            <ol className="feed">
              {feed.map(f => {
                const Icon = f.icon;
                const tag = f.intent && INTENT_TAG[f.intent];
                return (
                  <li key={f.id} className={'feed-' + f.tone}>
                    <span className="feed-icon"><Icon size={15} weight="fill" /></span>
                    <div>
                      <p>{f.text}{tag && <Tag tone={tag[1]} size="sm">{tag[0]}</Tag>}</p>
                      {f.quote && <q>{f.quote.length > 140 ? f.quote.slice(0, 138) + '…' : f.quote}</q>}
                    </div>
                    <time>{time(f.at)}</time>
                  </li>
                );
              })}
              {!feed.length && <li className="feed-empty">Nothing has happened yet today.</li>}
            </ol>
          </Card>
        </aside>
      </div>

      <Card title="Running low first" sub={'Counted down with every dose. Anything under ' + data.settings.refillDays + ' days left gets a refill text.'} action={<Link to="/medicines" className="link">All medicines <ArrowRight size={14} weight="bold" /></Link>}>
        <div className="supply-row">
          {low.map(({ med, days, refill }) => {
            const owner = personOf(data, med.personId);
            const tone = days <= data.settings.refillDays ? 'bad' : days <= 14 ? 'warn' : 'good';
            return (
              <article key={med.id} className={'supply tone-' + tone}>
                <header>
                  <PillIcon pill={med.pill} size={34} />
                  <Avatar who={owner} size={22} />
                </header>
                <strong>{medLabel(med)}</strong>
                <span className="supply-days"><b>{days}</b> days left</span>
                <span className="supply-bar"><i style={{ width: Math.min(100, (days / 30) * 100) + '%' }} /></span>
                <em>{refill ? (refill.status === 'ordered' ? 'Refill ordered' : 'Refill needed') : 'Runs out ' + shortDate(now + days * DAY)}</em>
              </article>
            );
          })}
        </div>
      </Card>

      <DoseSheet dose={open} onClose={() => setOpen(null)} />
    </div>
  );
}
