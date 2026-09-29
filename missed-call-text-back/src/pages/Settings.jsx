import { useState } from 'react';
import { FloppyDisk, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { fill } from '../demo/engine.js';

const TEXT = [
  ['Business', [
    ['businessName', 'Business name'],
    ['shortName', 'Short name used in texts'],
    ['ownerName', 'Owner name'],
    ['ownerPhone', 'Owner mobile for alerts'],
    ['ownerEmail', 'Owner email for the daily summary'],
    ['businessPhone', 'Business number customers call'],
    ['timezone', 'Time zone']
  ]],
  ['Area and hours', [
    ['areaLabel', 'Area, in words'],
    ['serviceZips', 'ZIP codes or prefixes you cover'],
    ['weekdayHours', 'Monday to Friday hours'],
    ['saturdayHours', 'Saturday hours'],
    ['slotTimes', 'Appointment start times'],
    ['vans', 'Vans on the road', 'number']
  ]],
  ['Follow-ups', [
    ['ringSeconds', 'Ring time before a call counts as missed (seconds)', 'number'],
    ['followUpMinutes', 'First nudge if no reply (minutes)', 'number'],
    ['finalFollowUpHours', 'Last nudge if still no reply (hours)', 'number']
  ]]
];

export default function Settings() {
  const { data, act, busy, demo } = useDesk();
  const [form, setForm] = useState(() => ({ ...data.settings, services: data.settings.services.map(x => ({ ...x })) }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSvc = (i, k, v) => setForm(f => ({ ...f, services: f.services.map((x, j) => (j === i ? { ...x, [k]: Number(v) || 0 } : x)) }));
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);

  const save = e => {
    e.preventDefault();
    const params = {};
    for (const [k, v] of Object.entries(form)) if (JSON.stringify(v) !== JSON.stringify(data.settings[k])) params[k] = k === 'services' ? JSON.stringify(v) : v;
    act('settings', params, 'Settings saved');
  };

  return (
    <form className="settings" onSubmit={save}>
      {TEXT.map(([title, fields]) => (
        <section key={title} className="panel form-panel">
          <h2 className="section-title">{title}</h2>
          <div className="form-grid">
            {fields.map(([k, label, type]) => (
              <label key={k} className="field">
                <span>{label}</span>
                <input type={type || 'text'} value={form[k]} onChange={e => set(k, e.target.value)} />
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="panel form-panel">
        <h2 className="section-title">Messages</h2>
        <div className="msg-grid">
          {[['textBack', 'Text back during opening hours'], ['afterHours', 'Text back after hours']].map(([k, label]) => (
            <div key={k} className="msg-edit">
              <label className="field">
                <span>{label}</span>
                <textarea rows={4} value={form[k]} onChange={e => set(k, e.target.value)} />
              </label>
              <div className="msg-preview" aria-label="Preview">
                <span>Preview</span>
                <p className="bubble them">{fill(form[k], form)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="muted small">{'{business}'} becomes your short name.</p>
      </section>

      <section className="panel form-panel">
        <h2 className="section-title">Services and prices</h2>
        <p className="muted">The AI quotes the starting price and uses the typical job value to count the money won back.</p>
        <div className="table-wrap">
          <table className="table svc-table">
            <thead><tr><th>Service</th><th>Starts at</th><th>Typical job</th><th>Treated as an emergency</th></tr></thead>
            <tbody>
              {form.services.map((svc, i) => (
                <tr key={svc.key}>
                  <td>{svc.name}</td>
                  <td><input className="mini" type="number" min="0" value={svc.from} onChange={e => setSvc(i, 'from', e.target.value)} aria-label={svc.name + ' starting price'} /></td>
                  <td><input className="mini" type="number" min="0" value={svc.typical} onChange={e => setSvc(i, 'typical', e.target.value)} aria-label={svc.name + ' typical job value'} /></td>
                  <td>{svc.urgent ? 'Yes' : 'When the customer says so'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel form-panel">
        <h2 className="section-title">AI replies</h2>
        <label className="switch">
          <input type="checkbox" checked={!!form.aiEnabled} onChange={e => set('aiEnabled', e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span>Let the AI reply to customers. When off, every text goes to {form.ownerName} and nothing is sent automatically except the first text back.</span>
        </label>
        {!demo && (
          <label className="switch">
            <input type="checkbox" checked={!!form.demoMode} onChange={e => set('demoMode', e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            <span>Demo mode: log every text instead of sending it through Twilio.</span>
          </label>
        )}
      </section>

      <div className="save-bar">
        <span className="muted">{demo ? 'Changes apply to this demo in your browser only.' : 'Changes are saved to your n8n workspace.'}</span>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('reset', {}, 'Demo data rebuilt').then(() => window.location.reload())}><ArrowCounterClockwise size={16} weight="bold" /> Reset demo data</button>
        <button type="submit" className="btn btn-primary" disabled={!dirty || busy}><FloppyDisk size={16} weight="fill" /> Save settings</button>
      </div>
    </form>
  );
}
