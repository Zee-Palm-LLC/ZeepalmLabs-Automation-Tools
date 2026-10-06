import { useEffect, useState } from 'react';
import { ArrowCounterClockwise, FloppyDisk } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { Card, Switch, Avatar } from '../components/ui.jsx';
import { slotsFor } from '../lib/metrics.js';
import { phone } from '../lib/format.js';

const NUM = [
  ['nudgeMinutes', 'Nudge after', 'minutes'],
  ['escalateMinutes', 'Text the first contact after', 'minutes'],
  ['backupMinutes', 'Text the backups after', 'minutes'],
  ['missAfterMinutes', 'Mark as missed after', 'minutes'],
  ['quietStart', 'Quiet hours start', ':00'],
  ['quietEnd', 'Quiet hours end', ':00'],
  ['refillDays', 'Refill text when supply drops to', 'days'],
  ['refillHour', 'Check supplies each day at', ':00']
];
const LIMITS = [
  ['bpHighSys', 'Blood pressure top number above'],
  ['bpHighDia', 'Blood pressure bottom number above'],
  ['bpLowSys', 'Blood pressure top number below'],
  ['glucoseHigh', 'Blood sugar above'],
  ['glucoseLow', 'Blood sugar below'],
  ['weightGainDay', 'Weight gain in a day (lb)'],
  ['weightGainWeek', 'Weight gain in a week (lb)']
];
const TEMPLATES = [
  ['templateDose', 'Dose reminder', '{first}, {slot}, {list}'],
  ['templateNudge', 'Nudge', '{first}, {slot}'],
  ['templateAlert', 'Family alert', '{name}, {their}, {them}, {they}, {slot}, {meds}'],
  ['templateRefill', 'Refill text', '{name}, {med}, {days}, {date}, {pharmacy}']
];

function Schedule({ p }) {
  const { data, act, busy } = useCare();
  const slots = slotsFor(data, p);
  return (
    <div className="sched">
      <div className="sched-who"><Avatar who={p} size={30} /><b>{p.name}</b><span>{phone(p.phone)}</span></div>
      <div className="sched-slots">
        {slots.map(s => (
          <label key={s.key} className="field">
            <span>{s.label}</span>
            <input type="time" defaultValue={p.schedule[s.key]} disabled={busy} onBlur={e => e.target.value !== p.schedule[s.key] && act('schedule', { person: p.id, slot: s.key, time: e.target.value }, s.label + ' moved to ' + e.target.value)} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { data, act, busy, demo } = useCare();
  const S = data.settings;
  const [form, setForm] = useState(S);
  useEffect(() => setForm(S), [S]);
  const dirty = Object.keys(form).some(k => String(form[k]) !== String(S[k]));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => {
    const out = {};
    for (const k of Object.keys(form)) if (String(form[k]) !== String(S[k]) && typeof S[k] !== 'object') out[k] = form[k];
    return act('settings', out, 'Settings saved');
  };
  return (
    <div className="settings">
      <Card title="Pill times" sub="Change a time and the reminders move with it, starting with the next one.">
        {data.people.map(p => <Schedule key={p.id} p={p} />)}
      </Card>
      <Card title="When to bring in the family">
        <div className="field-grid">
          {NUM.map(([k, label, unit]) => (
            <label key={k} className="field">
              <span>{label}</span>
              <span className="field-unit"><input type="number" value={form[k]} onChange={e => set(k, e.target.value)} /><em>{unit}</em></span>
            </label>
          ))}
        </div>
      </Card>
      <Card title="Reading limits" sub="Set these with the doctor. Dose Circle texts the family when a reading is outside them and never says what it means.">
        <div className="field-grid">
          {LIMITS.map(([k, label]) => (
            <label key={k} className="field">
              <span>{label}</span>
              <input type="number" value={form[k]} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
        </div>
      </Card>
      <Card title="Message wording" sub="Words in braces are filled in for each text.">
        <div className="tpl-grid">
          {TEMPLATES.map(([k, label, vars]) => (
            <label key={k} className="field">
              <span>{label}<em>{vars}</em></span>
              <textarea rows={3} value={form[k]} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
        </div>
      </Card>
      <Card title="Texting and AI">
        <div className="switches">
          <Switch checked={form.aiEnabled} onChange={v => set('aiEnabled', v)} label="Automatic replies" hint="Off means every reply waits for the family." />
          <Switch checked={form.demoMode} onChange={v => set('demoMode', v)} label="Demo mode" hint="Texts are logged but never sent through Twilio." />
        </div>
        <div className="field-grid">
          <label className="field"><span>Texting number</span><input value={form.textingNumber} onChange={e => set('textingNumber', e.target.value)} /></label>
          <label className="field"><span>Claude model (n8n only)</span><input value={form.claudeModel} onChange={e => set('claudeModel', e.target.value)} /></label>
          <label className="field"><span>Time zone</span><input value={form.timezone} onChange={e => set('timezone', e.target.value)} /></label>
        </div>
      </Card>
      <div className="save-bar">
        {demo && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('reset', {}, 'Demo family reset')}><ArrowCounterClockwise size={16} weight="bold" /> Reset demo data</button>}
        <button type="button" className="btn btn-primary" disabled={!dirty || busy} onClick={save}><FloppyDisk size={16} weight="fill" /> Save changes</button>
      </div>
    </div>
  );
}
