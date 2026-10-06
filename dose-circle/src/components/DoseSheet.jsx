import { CheckCircle, BellRinging, ChatCircleDots } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { Modal, Tag, Avatar } from './ui.jsx';
import { PillIcon } from './Pill.jsx';
import { Compartment } from './Pillbox.jsx';
import { personOf, medOf, memberOf } from '../lib/metrics.js';
import { dayName, time, clock } from '../lib/format.js';
import { DOSE_STATUS, slotOf, weekdayOf, medLabel, pillPhrase } from '../demo/engine.js';

export default function DoseSheet({ dose, onClose }) {
  const { data, now, act, busy } = useCare();
  const live = dose ? data.doses.find(d => d.id === dose.id) || dose : null;
  const p = live ? personOf(data, live.personId) : null;
  const msgs = live ? data.messages.filter(m => m.doseId === live.id && Date.parse(m.at) <= now).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [];
  const st = live ? DOSE_STATUS[live.status] : null;
  const by = live && live.by ? memberOf(data, live.by) : null;
  return (
    <Modal open={!!live} onClose={onClose} title={live ? slotOf(live.slot).label + ' pills, ' + dayName(live.due, now).toLowerCase() : ''}>
      {live && (
        <div className="sheet">
          <div className="sheet-top">
            <Compartment dose={live} wd={weekdayOf(Date.parse(live.due))} big now={now} />
            <div className="sheet-sum">
              <div className="sheet-who"><Avatar who={p} size={28} /> <strong>{p.name}</strong></div>
              <Tag tone={st.tone}>{st.label}</Tag>
              <p>
                Due at {time(live.due)}.
                {live.takenAt && ' Taken at ' + time(live.takenAt) + (live.via === 'family' ? ', confirmed by ' + (by ? by.name.split(' ')[0] : 'the family') : ' by text') + '.'}
                {live.status === 'missed' && ' Never confirmed.'}
                {live.reason && ' “' + live.reason + '”'}
              </p>
            </div>
          </div>
          <ul className="sheet-meds">
            {live.meds.map(x => {
              const m = medOf(data, x.medId);
              if (!m) return null;
              const skipped = live.missed.includes(m.id);
              return (
                <li key={m.id} className={skipped ? 'is-skipped' : ''}>
                  <PillIcon pill={m.pill} size={30} />
                  <span><b>{(x.count > 1 ? x.count + ' × ' : '') + medLabel(m)}</b><em>{pillPhrase(m)}, for {m.purpose}{m.withFood ? ', with food' : ''}</em></span>
                  {skipped && <Tag tone="warn" size="sm">Skipped</Tag>}
                </li>
              );
            })}
          </ul>
          {msgs.length > 0 && (
            <div className="sheet-thread">
              <h3><ChatCircleDots size={16} weight="duotone" /> Texts about this dose</h3>
              {msgs.map(m => (
                <div key={m.id} className={'mini-msg mini-' + m.dir}>
                  <span>{m.dir === 'in' ? (personOf(data, m.thread) || memberOf(data, m.thread) || {}).name : m.dir === 'note' ? 'Dose Circle note' : 'Dose Circle to ' + ((personOf(data, m.thread) || memberOf(data, m.thread) || {}).name || '').split(' ')[0]}</span>
                  <p>{m.body}</p>
                  <em>{clock(m.at)}</em>
                </div>
              ))}
            </div>
          )}
          {(live.status === 'due' || live.status === 'missed' || live.status === 'scheduled') && (
            <div className="sheet-actions">
              {live.status !== 'missed' && (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('remind', { dose: live.id }, 'Reminder sent to ' + p.name.split(' ')[0])}>
                  <BellRinging size={17} weight="duotone" /> {live.status === 'scheduled' ? 'Send the reminder now' : 'Remind again'}
                </button>
              )}
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act('mark', { dose: live.id, status: 'taken' }, 'Marked as taken')}>
                <CheckCircle size={17} weight="fill" /> {p.pronouns.they === 'she' ? 'She' : p.pronouns.they === 'he' ? 'He' : 'They'} took them
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
