import { useState } from 'react';
import { Printer, Heartbeat, Drop, Scales, Stethoscope, ChatText } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Card, Tag, Avatar, Segmented, Empty, Modal } from '../components/ui.jsx';
import { LineChart } from '../components/charts.jsx';
import { callName } from './Today.jsx';
import { readingSeries, adherence, personOf, memberOf } from '../lib/metrics.js';
import { shortDate, time, pct, fullDate } from '../lib/format.js';
import { DAY, dayStart, readingLabel, READING_NAME, medLabel, slotOf, ALERT_KIND } from '../demo/engine.js';

const ICON = { bp: Heartbeat, glucose: Drop, weight: Scales };

function Summary({ p, onClose, open }) {
  const { data, now } = useCare();
  const end = dayStart(now);
  const from = end - 30 * DAY;
  const a = adherence(data, p.id, from, end);
  const avg = type => {
    const xs = readingSeries(data, p.id, type, 30, now);
    if (!xs.length) return null;
    if (type === 'bp') return Math.round(xs.reduce((q, r) => q + r.sys, 0) / xs.length) + '/' + Math.round(xs.reduce((q, r) => q + r.dia, 0) / xs.length);
    return Math.round((xs.reduce((q, r) => q + r.value, 0) / xs.length) * 10) / 10;
  };
  const flagged = data.readings.filter(r => r.personId === p.id && r.flag && Date.parse(r.at) >= from);
  const said = data.alerts.filter(x => x.personId === p.id && Date.parse(x.at) >= from && ['symptom', 'partial', 'question', 'emergency', 'double'].includes(x.kind));
  const misses = data.doses.filter(d => d.personId === p.id && Date.parse(d.due) >= from && ['missed', 'partial', 'skipped'].includes(d.status));
  return (
    <Modal open={open} onClose={onClose} title={'For ' + p.doctor} wide>
      <div className="summary" id="print-summary">
        <header>
          <h3>{p.name}, {p.age}</h3>
          <p>Medicine and readings summary, {shortDate(from + DAY / 2)} to {shortDate(end - DAY / 2)}. Collected by text message with Dose Circle and not checked by a clinician.</p>
        </header>
        <section>
          <h4>Medicines</h4>
          <table>
            <tbody>
              {data.meds.filter(m => m.personId === p.id && m.active !== false).map(m => {
                let due = 0;
                let got = 0;
                for (const d of data.doses) {
                  if (d.personId !== p.id || Date.parse(d.due) < from || Date.parse(d.due) >= end) continue;
                  if (!d.meds.some(x => x.medId === m.id) || !['taken', 'partial', 'skipped', 'missed'].includes(d.status)) continue;
                  due += 1;
                  if ((d.status === 'taken' || d.status === 'partial') && !d.missed.includes(m.id)) got += 1;
                }
                return (
                  <tr key={m.id}>
                    <td><b>{medLabel(m)}</b><br /><span>For {m.purpose}</span></td>
                    <td>{Object.entries(m.doses).map(([k, n]) => n + ' ' + slotOf(k).word).join(', ')}</td>
                    <td className="num">{due ? Math.round((got / due) * 100) + '%' : 'n/a'}<br /><span>{got} of {due} doses</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="summary-total">Overall {pct(a.pct)} of doses taken. {a.missed} never answered, {a.partial + a.skipped} partly taken or skipped.</p>
        </section>
        <section>
          <h4>Readings</h4>
          <ul>
            {['bp', 'glucose', 'weight'].map(t => (avg(t) != null ? <li key={t}>{READING_NAME[t]} averaged {avg(t)}{t === 'glucose' ? ' mg/dL' : t === 'weight' ? ' lb' : ''}</li> : null))}
            {flagged.map(r => <li key={r.id} className="is-flag">{shortDate(r.at)}: {READING_NAME[r.type].toLowerCase()} {readingLabel(r)}, {r.note.toLowerCase()}</li>)}
          </ul>
        </section>
        {(said.length > 0 || misses.some(d => d.reason)) && (
          <section>
            <h4>In {p.pronouns.their} own words</h4>
            <ul>
              {said.map(x => <li key={x.id}>{shortDate(x.at)}: “{x.text}”</li>)}
            </ul>
          </section>
        )}
        <footer className="summary-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><Printer size={16} weight="fill" /> Print or save as PDF</button>
        </footer>
      </div>
    </Modal>
  );
}

export default function Health() {
  const { data, now } = useCare();
  const { person, setPerson } = useUi();
  const [days, setDays] = useState(30);
  const [sheet, setSheet] = useState(false);
  const p = personOf(data, person) || data.people[0];
  const S = data.settings;
  const me = memberOf(data, S.viewer);
  const end = now;
  const from = dayStart(now) - (days - 1) * DAY;
  const types = ['bp', 'glucose', 'weight'].filter(t => p.tracks.includes(t) || data.readings.some(r => r.personId === p.id && r.type === t));
  const notes = data.alerts
    .filter(a => a.personId === p.id && ['symptom', 'partial', 'question', 'emergency', 'double', 'reading', 'callback'].includes(a.kind) && Date.parse(a.at) >= from)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <div className="health">
      <div className="page-bar">
        <Segmented label="Whose readings" value={p.id} onChange={setPerson} options={data.people.map(x => ({ value: x.id, label: callName(data, x), icon: <Avatar who={x} size={18} /> }))} />
        <Segmented size="sm" label="Range" value={days} onChange={setDays} options={[{ value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }]} />
        <button type="button" className="btn btn-primary btn-sm push" onClick={() => setSheet(true)}><Stethoscope size={16} weight="fill" /> Summary for {p.doctor}</button>
      </div>
      <p className="page-lede">{callName(data, p)} texts readings in plain words, like “bp 138/84” or “weighed 183.2”. Dose Circle logs them, and texts {me ? me.name.split(' ')[0] : 'the family'} when one is outside the range you set. It never tells anyone what a reading means.</p>
      <div className="charts">
        {types.map(t => {
          const xs = readingSeries(data, p.id, t, days, now);
          const Icon = ICON[t];
          const latest = xs[xs.length - 1];
          let chart = null;
          if (t === 'bp') {
            chart = (
              <LineChart
                label="Blood pressure"
                from={from}
                to={end}
                domain={[50, 190]}
                band={[90, 140]}
                limits={[{ value: S.bpHighSys, label: 'Top limit ' + S.bpHighSys, tone: 'bad' }, { value: S.bpHighDia, label: 'Bottom limit ' + S.bpHighDia, tone: 'warn' }]}
                series={[
                  { key: 'sys', className: 's-sys', points: xs.map(r => ({ id: r.id + 's', t: Date.parse(r.at), v: r.sys, label: readingLabel(r), flag: r.flag, note: r.note })) },
                  { key: 'dia', className: 's-dia', points: xs.map(r => ({ id: r.id + 'd', t: Date.parse(r.at), v: r.dia, label: readingLabel(r), flag: r.flag, note: r.note })) }
                ]}
              />
            );
          } else if (t === 'glucose') {
            chart = <LineChart label="Blood sugar" unit=" mg/dL" from={from} to={end} domain={[40, 280]} band={[80, 180]} limits={[{ value: S.glucoseHigh, label: 'High ' + S.glucoseHigh, tone: 'bad' }, { value: S.glucoseLow, label: 'Low ' + S.glucoseLow, tone: 'bad' }]} series={[{ key: 'g', className: 's-glu', points: xs.map(r => ({ id: r.id, t: Date.parse(r.at), v: r.value, flag: r.flag, note: r.note, label: readingLabel(r) })) }]} />;
          } else {
            const vs = xs.map(r => r.value);
            const lo = Math.floor((vs.length ? Math.min(...vs) : 170) - 4);
            const hi = Math.ceil((vs.length ? Math.max(...vs) : 190) + 4);
            chart = <LineChart label="Weight" unit=" lb" from={from} to={end} domain={[lo, hi]} series={[{ key: 'w', className: 's-wt', points: xs.map(r => ({ id: r.id, t: Date.parse(r.at), v: r.value, flag: r.flag, note: r.note, label: readingLabel(r) })) }]} />;
          }
          return (
            <Card
              key={t}
              title={<span className="title-who"><Icon size={18} weight="duotone" /> {READING_NAME[t]}</span>}
              sub={xs.length + ' readings' + (t === 'weight' ? ', alerts on a gain of ' + S.weightGainDay + ' lb in a day or ' + S.weightGainWeek + ' lb in a week' : '')}
              action={latest && <span className={'latest' + (latest.flag ? ' is-flag' : '')}><b>{readingLabel(latest)}</b><em>{shortDate(latest.at)}, {time(latest.at)}</em></span>}
            >
              {xs.length ? chart : <Empty icon={Icon} title="No readings yet">They show up here as soon as one is texted in.</Empty>}
            </Card>
          );
        })}
      </div>
      <Card title={<span className="title-who"><ChatText size={18} weight="duotone" /> Worth telling the doctor</span>} sub="Symptoms, skipped pills, questions and readings outside the range, in their own words">
        {notes.length ? (
          <ul className="notes">
            {notes.map(a => {
              const k = ALERT_KIND[a.kind];
              return (
                <li key={a.id}>
                  <time>{shortDate(a.at)}<em>{time(a.at)}</em></time>
                  <Tag tone={k.tone} size="sm">{k.label}</Tag>
                  <p>{a.kind === 'reading' ? a.title + '. ' + a.text + '.' : '“' + a.text + '”'}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon={Stethoscope} title="Nothing to report">No symptoms, questions or readings outside the range.</Empty>
        )}
      </Card>
      <Summary p={p} open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}
