import { useState } from 'react';
import { Package, Storefront, Stethoscope, PencilSimple, Check, X, ForkKnife } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { Card, Tag, Avatar } from '../components/ui.jsx';
import { PillIcon } from '../components/Pill.jsx';
import { SLOT_ICON } from '../components/Pillbox.jsx';
import { callName } from './Today.jsx';
import { supply } from '../lib/metrics.js';
import { shortDate, ago } from '../lib/format.js';
import { DAY, SLOTS, pillPhrase } from '../demo/engine.js';

function Count({ med }) {
  const { act, busy } = useCare();
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(String(med.supply));
  if (!edit) {
    return (
      <button type="button" className="count-btn" onClick={() => { setValue(String(med.supply)); setEdit(true); }}>
        <b>{med.supply}</b> left <PencilSimple size={13} weight="bold" />
      </button>
    );
  }
  const save = async e => {
    e.preventDefault();
    try {
      await act('supply', { med: med.id, count: value }, med.name + ' count updated');
      setEdit(false);
    } catch (err) {
      return undefined;
    }
    return undefined;
  };
  return (
    <form className="count-form" onSubmit={save}>
      <input type="number" min="0" max="2000" value={value} onChange={e => setValue(e.target.value)} aria-label={'Pills of ' + med.name + ' left'} autoFocus />
      <button type="submit" className="icon-btn" disabled={busy} aria-label="Save"><Check size={15} weight="bold" /></button>
      <button type="button" className="icon-btn" onClick={() => setEdit(false)} aria-label="Cancel"><X size={15} weight="bold" /></button>
    </form>
  );
}

function MedCard({ row }) {
  const { data, now, act, busy } = useCare();
  const { med, days, refill } = row;
  const S = data.settings;
  const tone = days <= S.refillDays ? 'bad' : days <= 14 ? 'warn' : 'good';
  return (
    <article className={'med tone-' + tone}>
      <div className="med-art"><PillIcon pill={med.pill} size={64} /></div>
      <div className="med-main">
        <header>
          <h3>{med.name} <span>{med.strength}</span></h3>
          <p>For {med.purpose}. {pillPhrase(med).replace(/^the /, 'The ')}.</p>
        </header>
        <ul className="med-when">
          {SLOTS.filter(s => Number((med.doses || {})[s.key] || 0) > 0).map(s => {
            const Icon = SLOT_ICON[s.key];
            return <li key={s.key}><Icon size={14} weight="duotone" /> {s.label}{med.doses[s.key] > 1 ? ' × ' + med.doses[s.key] : ''}</li>;
          })}
          {med.withFood && <li className="is-food"><ForkKnife size={14} weight="duotone" /> With food</li>}
        </ul>
        {med.note && <p className="med-note">{med.note}</p>}
        <div className="med-supply">
          <div className="med-days"><b>{days}</b><span>days left</span></div>
          <div className="med-bar"><i style={{ width: Math.min(100, (days / 45) * 100) + '%' }} /><em style={{ left: Math.min(100, (S.refillDays / 45) * 100) + '%' }} title="Refill text goes out here" /></div>
          <Count med={med} />
        </div>
        <footer className="med-foot">
          <span><Storefront size={14} weight="duotone" /> {med.pharmacy}</span>
          {med.prescriber && <span><Stethoscope size={14} weight="duotone" /> {med.prescriber}</span>}
          <span className="med-refill">
            {refill ? (
              <>
                <Tag tone={refill.status === 'ordered' ? 'blue' : 'bad'} size="sm">{refill.status === 'ordered' ? 'Ordered ' + ago(refill.orderedAt, now) : 'Refill needed'}</Tag>
                {refill.status === 'needed' && <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('refill', { refill: refill.id, status: 'ordered' }, 'Marked as ordered')}>Ordered</button>}
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => act('refill', { refill: refill.id, status: 'picked' }, med.name + ' restocked')}><Package size={14} weight="fill" /> Picked up</button>
              </>
            ) : (
              <>
                <em>Runs out {shortDate(now + days * DAY)}</em>
                <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('request-refill', { med: med.id }, 'Refill text sent')}>Start a refill</button>
              </>
            )}
          </span>
        </footer>
      </div>
    </article>
  );
}

export default function Medicines() {
  const { data } = useCare();
  const rows = supply(data);
  return (
    <div className="meds-page">
      <p className="page-lede">Dose Circle describes every pill by what it looks like, because that’s how people talk about them. “The big white one” is enough for it to know which medicine was skipped.</p>
      {data.people.map(p => {
        const mine = rows.filter(r => r.med.personId === p.id);
        return (
          <Card key={p.id} title={<span className="title-who"><Avatar who={p} size={28} /> {callName(data, p)}’s medicines</span>} sub={mine.length + ' medicines, ' + p.conditions.join(', ').toLowerCase()}>
            <div className="med-grid">
              {mine.map(r => <MedCard key={r.med.id} row={r} />)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
