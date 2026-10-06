import { useState } from 'react';
import { CalendarCheck, Clock, WarningCircle, Fire, Phone } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Card, Tag, Avatar, Segmented, Empty, CountUp } from '../components/ui.jsx';
import Pillbox, { LIDS } from '../components/Pillbox.jsx';
import { PillIcon } from '../components/Pill.jsx';
import { Bars } from '../components/charts.jsx';
import DoseSheet from '../components/DoseSheet.jsx';
import { callName } from './Today.jsx';
import { adherence, weekOf, lastDays, dosesOn, slotsFor, streak, alertStats, personOf, medOf } from '../lib/metrics.js';
import { pct, weekdayShort, dayNum, shortDate, time, plural } from '../lib/format.js';
import { DAY, dayStart, addDays, weekdayOf, slotOf, medLabel } from '../demo/engine.js';

export default function PillboxPage() {
  const { data, now } = useCare();
  const { person, setPerson } = useUi();
  const [open, setOpen] = useState(null);
  const [week, setWeek] = useState(0);
  const p = personOf(data, person) || data.people[0];
  const end = dayStart(now);
  const month = adherence(data, p.id, end - 30 * DAY, end);
  const prev = adherence(data, p.id, end - 60 * DAY, end - 30 * DAY);
  const days = streak(data, p.id, now);
  const alerts = alertStats(data, end - 30 * DAY, now);
  const slots = slotsFor(data, p);
  const span = lastDays(now, 30);
  const weekDays = weekOf(addDays(now, week * 7));
  const misses = data.doses
    .filter(d => d.personId === p.id && Date.parse(d.due) >= end - 30 * DAY && ['missed', 'partial', 'skipped'].includes(d.status))
    .sort((a, b) => Date.parse(b.due) - Date.parse(a.due));
  const perMed = data.meds.filter(m => m.personId === p.id && m.active !== false).map(m => {
    let due = 0;
    let got = 0;
    for (const d of data.doses) {
      if (d.personId !== p.id || Date.parse(d.due) < end - 30 * DAY || !['taken', 'partial', 'skipped', 'missed'].includes(d.status)) continue;
      const x = d.meds.find(y => y.medId === m.id);
      if (!x) continue;
      due += 1;
      if ((d.status === 'taken' || d.status === 'partial') && !d.missed.includes(m.id)) got += 1;
    }
    return { key: m.id, label: medLabel(m), icon: <PillIcon pill={m.pill} size={22} />, value: due ? got / due : 0, sub: got + ' of ' + due, tone: due && got / due < 0.9 ? 'warn' : 'good' };
  });

  return (
    <div className="pb-page">
      <div className="page-bar">
        <Segmented label="Whose pillbox" value={p.id} onChange={setPerson} options={data.people.map(x => ({ value: x.id, label: callName(data, x) + ', ' + x.name.split(' ')[0], icon: <Avatar who={x} size={18} /> }))} />
      </div>

      <div className="stats">
        <article className="stat">
          <span className="stat-icon"><CalendarCheck size={20} weight="duotone" /></span>
          <strong><CountUp value={Math.round((month.pct || 0) * 100)} />%</strong>
          <span>of doses taken, last 30 days</span>
          <em className={month.pct >= prev.pct ? 'up' : 'down'}>{prev.pct != null ? (month.pct >= prev.pct ? 'Up' : 'Down') + ' from ' + pct(prev.pct) : 'First month'}</em>
        </article>
        <article className="stat">
          <span className="stat-icon"><Clock size={20} weight="duotone" /></span>
          <strong><CountUp value={Math.round((month.onTime || 0) * 100)} />%</strong>
          <span>taken within 30 minutes</span>
          <em>Most replies come in under 10 minutes</em>
        </article>
        <article className="stat">
          <span className="stat-icon"><WarningCircle size={20} weight="duotone" /></span>
          <strong><CountUp value={month.missed + month.partial + month.skipped} /></strong>
          <span>missed, skipped or partly taken</span>
          <em>{plural(month.missed, 'never answered', 'never answered')}</em>
        </article>
        <article className="stat">
          <span className="stat-icon"><Phone size={20} weight="duotone" /></span>
          <strong><CountUp value={alerts.family} /></strong>
          <span>times the family was texted</span>
          <em>{alerts.median != null ? 'Usually answered in ' + Math.max(1, Math.round(alerts.median)) + ' min' : 'No alerts yet'}</em>
        </article>
      </div>

      <Card
        title={week === 0 ? 'This week' : week < 0 ? plural(-week, 'week') + ' ago' : 'Next week'}
        sub={shortDate(weekDays[0] + DAY / 2) + ' to ' + shortDate(weekDays[6] + DAY / 2) + '. Tap a compartment to see the texts behind it.'}
        action={<Segmented size="sm" label="Week" value={week} onChange={setWeek} options={[{ value: -3, label: '3 wks ago' }, { value: -2, label: '2 wks' }, { value: -1, label: 'Last week' }, { value: 0, label: 'This week' }]} />}
      >
        <Pillbox person={p} days={weekDays} now={now} onOpen={setOpen} />
      </Card>

      <div className="split">
        <Card title="Last 30 days" sub={days > 1 ? days + ' full days in a row with nothing missed' : 'One square per dose'}>
          <div className="heat" style={{ '--rows': slots.length }}>
            {span.map(d => {
              const list = dosesOn(data, p.id, d);
              return (
                <div key={d} className={'heat-day' + (d === end ? ' is-today' : '')} title={shortDate(d + DAY / 2)}>
                  <span className="heat-wd" style={{ color: LIDS[weekdayOf(d)] }}>{weekdayShort(d + DAY / 2).slice(0, 1)}</span>
                  {slots.map(sl => {
                    const dose = list.find(x => x.slot === sl.key);
                    return <button key={sl.key} type="button" className={'heat-cell st-' + (dose ? dose.status : 'none')} onClick={() => dose && setOpen(dose)} aria-label={slotOf(sl.key).label + ', ' + shortDate(d + DAY / 2) + ': ' + (dose ? dose.status : 'nothing')} disabled={!dose} />;
                  })}
                  <span className="heat-num">{dayNum(d + DAY / 2)}</span>
                </div>
              );
            })}
          </div>
          <div className="heat-rows">{slots.map(sl => <span key={sl.key}>{sl.label}</span>)}</div>
        </Card>
        <Card title="By medicine" sub="Doses of each medicine actually taken">
          <Bars items={perMed} />
        </Card>
      </div>

      <Card title="Missed and skipped" sub="With what was said at the time, so the doctor gets the full picture">
        {misses.length ? (
          <ul className="misses">
            {misses.map(d => (
              <li key={d.id}>
                <button type="button" onClick={() => setOpen(d)}>
                  <span className="misses-when"><b>{shortDate(d.due)}</b><em>{slotOf(d.slot).label}, {time(d.due)}</em></span>
                  <Tag tone={d.status === 'missed' ? 'bad' : d.status === 'partial' ? 'warn' : 'quiet'} size="sm">{d.status === 'missed' ? 'Missed' : d.status === 'partial' ? 'Skipped one' : 'Skipped'}</Tag>
                  <span className="misses-what">
                    {d.status === 'missed' ? 'No reply to the reminder or the nudge' : d.missed.map(id => (medOf(data, id) || {}).name).join(', ')}
                    {d.reason && <q>{d.reason}</q>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={Fire} title="Nothing missed in 30 days">Every dose was taken.</Empty>
        )}
      </Card>
      <DoseSheet dose={open} onClose={() => setOpen(null)} />
    </div>
  );
}
