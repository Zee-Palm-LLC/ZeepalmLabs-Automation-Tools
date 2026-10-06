import { Fragment } from 'react';
import { motion } from 'motion/react';
import { Check, SunHorizon, Sun, CloudSun, MoonStars, Minus } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { PillIcon } from './Pill.jsx';
import { dosesOn, slotsFor, medOf } from '../lib/metrics.js';
import { weekdayShort, dayNum, time } from '../lib/format.js';
import { dayStart, weekdayOf, slotAt } from '../demo/engine.js';

export const LIDS = ['#f06ba2', '#8e7cf8', '#4f9bff', '#1fb5a3', '#6dbb43', '#f2b233', '#fb8a49'];
export const SLOT_ICON = { morning: SunHorizon, midday: Sun, evening: CloudSun, bedtime: MoonStars };

export function hm(v) {
  const [h, m] = String(v || '0:0').split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ap;
}

const STATUS_TEXT = { taken: 'Taken', partial: 'Partly', skipped: 'Skipped', missed: 'Missed', due: 'Waiting', scheduled: '' };

export function pillsOf(data, dose) {
  const out = [];
  for (const x of dose.meds) {
    const m = medOf(data, x.medId);
    if (!m) continue;
    for (let i = 0; i < x.count; i++) out.push(m);
  }
  return out;
}

export function Compartment({ dose, wd, big, onOpen, now, label }) {
  const { data } = useCare();
  const lid = LIDS[wd];
  if (!dose) return <div className="comp comp-none" style={{ '--lid': lid }} aria-hidden="true" />;
  const st = dose.status;
  const pills = pillsOf(data, dose);
  const left = st === 'taken' ? [] : st === 'partial' ? pills.filter(m => dose.missed.includes(m.id)) : pills;
  const open = st === 'taken' || st === 'partial' || st === 'skipped';
  const late = st === 'taken' && dose.takenAt && Date.parse(dose.takenAt) - Date.parse(dose.due) > 30 * 60000;
  const meta = st === 'taken' || st === 'partial' ? time(dose.takenAt) : st === 'scheduled' ? (Date.parse(dose.due) > now ? '' : '') : STATUS_TEXT[st];
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      className={'comp comp-' + st + (big ? ' comp-big' : '') + (open ? ' is-open' : '') + (late ? ' is-late' : '') + (dose.virtual ? ' is-virtual' : '')}
      style={{ '--lid': lid }}
      onClick={onOpen ? () => onOpen(dose) : undefined}
      aria-label={label || (STATUS_TEXT[st] || 'Coming up')}
    >
      <motion.span className="comp-lid" initial={false} animate={{ rotateX: open ? 74 : 0, y: open ? -5 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} />
      <span className="comp-tray">
        {left.map((m, i) => (
          <motion.span key={m.id + i} className="comp-pill" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ delay: i * 0.03 }}>
            <PillIcon pill={m.pill} size={big ? 44 : 22} tilt={((i * 47) % 70) - 35} faded={st === 'scheduled' && !big} />
          </motion.span>
        ))}
        {st === 'taken' && (
          <motion.span className="comp-check" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
            <Check size={big ? 34 : 15} weight="bold" />
          </motion.span>
        )}
        {st === 'skipped' && <span className="comp-check"><Minus size={big ? 30 : 14} weight="bold" /></span>}
      </span>
      {meta && <span className="comp-meta">{meta}</span>}
    </Tag>
  );
}

export default function Pillbox({ person, days, now, onOpen, compact }) {
  const { data } = useCare();
  const slots = slotsFor(data, person);
  const today = dayStart(now);
  return (
    <div className={'pillbox' + (compact ? ' is-compact' : '')} style={{ '--cols': days.length }} role="grid" aria-label={'Pillbox for ' + person.name}>
      <div className="pb-corner" aria-hidden="true" />
      {days.map(d => (
        <div key={d} className={'pb-day' + (d === today ? ' is-today' : '') + (d > today ? ' is-future' : '')} style={{ '--lid': LIDS[weekdayOf(d)] }} role="columnheader">
          <b>{weekdayShort(d + 43200000)}</b>
          <span>{dayNum(d + 43200000)}</span>
        </div>
      ))}
      {slots.map(sl => {
        const Icon = SLOT_ICON[sl.key];
        return (
          <Fragment key={sl.key}>
            <div className="pb-slot" role="rowheader">
              <Icon size={18} weight="duotone" />
              <span><b>{sl.label}</b><em>{hm(person.schedule[sl.key])}</em></span>
            </div>
            {days.map(d => {
              let dose = dosesOn(data, person.id, d).find(x => x.slot === sl.key);
              if (!dose && d > today) {
                const meds = data.meds.filter(m => m.personId === person.id && m.active !== false && Number((m.doses || {})[sl.key] || 0) > 0).map(m => ({ medId: m.id, count: Number(m.doses[sl.key]) }));
                if (meds.length) dose = { id: 'v' + d + sl.key, virtual: true, personId: person.id, slot: sl.key, due: new Date(slotAt(person, sl.key, d)).toISOString(), meds, status: 'scheduled', missed: [] };
              }
              return (
                <div key={d} className={'pb-cell' + (d === today ? ' is-today' : '')} role="gridcell">
                  <Compartment dose={dose} wd={weekdayOf(d)} now={now} onOpen={dose && !dose.virtual ? onOpen : undefined} />
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
