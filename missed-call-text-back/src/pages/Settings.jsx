import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FloppyDisk, ArrowCounterClockwise, Storefront, Clock, ChatText, Tag, Robot, Warning, ArrowUUpLeft } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, Switch } from '../components/ui.jsx';
import { fill } from '../demo/engine.js';

const SECTIONS = [
  { id: 'business', label: 'Business', icon: Storefront },
  { id: 'hours', label: 'Area and hours', icon: Clock },
  { id: 'messages', label: 'Messages', icon: ChatText },
  { id: 'services', label: 'Services and prices', icon: Tag },
  { id: 'automation', label: 'Automation', icon: Robot },
  { id: 'danger', label: 'Demo data', icon: Warning }
];

const Field = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export default function Settings() {
  const { data, act, busy, demo } = useDesk();
  const clone = () => ({ ...data.settings, services: data.settings.services.map(x => ({ ...x })) });
  const [form, setForm] = useState(clone);
  const [active, setActive] = useState('business');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSvc = (i, k, v) => setForm(f => ({ ...f, services: f.services.map((x, j) => (j === i ? { ...x, [k]: k === 'urgent' ? v : Number(v) || 0 } : x)) }));
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById('set-' + s.id)).filter(Boolean);
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id.replace('set-', ''));
    }, { rootMargin: '-20% 0px -60% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const save = () => {
    const params = {};
    for (const [k, v] of Object.entries(form)) if (JSON.stringify(v) !== JSON.stringify(data.settings[k])) params[k] = k === 'services' ? JSON.stringify(v) : v;
    act('settings', params, 'Settings saved');
  };

  const jump = id => {
    setActive(id);
    const el = document.getElementById('set-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const text = (k, label, hint, type = 'text') => (
    <Field label={label} hint={hint}>
      <input className="input" type={type} value={form[k] ?? ''} onChange={e => set(k, e.target.value)} />
    </Field>
  );

  return (
    <div className="settings">
      <nav className="set-nav" aria-label="Settings sections">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} type="button" className={'set-link' + (active === s.id ? ' on' : '')} onClick={() => jump(s.id)}>
              {active === s.id && <motion.span layoutId="set-active" className="set-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icon size={17} weight={active === s.id ? 'fill' : 'regular'} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="set-body">
        <Card id="set-business" title="Business" sub="Shown in texts and used for owner alerts">
          <div className="form-grid">
            {text('businessName', 'Business name')}
            {text('shortName', 'Short name used in texts', 'Keeps texts short, like "Hi, it\'s BrightFlow"')}
            {text('ownerName', 'Owner name')}
            {text('ownerPhone', 'Owner mobile', 'Emergencies and call-back requests are texted here', 'tel')}
            {text('ownerEmail', 'Owner email', 'The daily summary goes here', 'email')}
            {text('businessPhone', 'Business number', 'The Twilio number customers call', 'tel')}
            {text('timezone', 'Time zone', 'Opening hours and slots use this zone')}
            {text('currency', 'Currency symbol')}
          </div>
        </Card>

        <Card id="set-hours" title="Area and hours" sub="The AI only offers slots inside these hours, and only books ZIP codes you cover">
          <div className="form-grid">
            {text('areaLabel', 'Area, in words', 'How the AI describes where you work')}
            {text('serviceZips', 'ZIP codes or prefixes', 'Comma separated. 787 covers every ZIP starting with 787')}
            {text('weekdayHours', 'Monday to Friday', 'Like 07:00-18:00')}
            {text('saturdayHours', 'Saturday', 'Leave empty if closed')}
            {text('slotTimes', 'Appointment start times', 'Comma separated, like 08:00, 10:30')}
            {text('vans', 'Vans on the road', 'Jobs that can share one slot', 'number')}
          </div>
        </Card>

        <Card id="set-messages" title="Messages" sub="The first text a caller gets. {business} becomes your short name.">
          <div className="msg-grid">
            {[['textBack', 'During opening hours'], ['afterHours', 'After hours']].map(([k, label]) => (
              <div key={k} className="msg-edit">
                <Field label={label}>
                  <textarea className="input" rows={5} value={form[k]} onChange={e => set(k, e.target.value)} />
                </Field>
                <div className="msg-preview" aria-label="Preview">
                  <span className="field-label">Preview</span>
                  <div className="mini-phone">
                    <span className="mini-sender">{form.shortName}</span>
                    <p className="bubble them">{fill(form[k], form)}</p>
                    <span className="mini-meta">{fill(form[k], form).length} characters</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card id="set-services" title="Services and prices" sub="The AI quotes the starting price. The typical job value is used to count money won back." pad={false}>
          <div className="table-wrap">
            <table className="table svc-table">
              <thead><tr><th>Service</th><th>Starts at</th><th>Typical job</th><th>Always an emergency</th></tr></thead>
              <tbody>
                {form.services.map((svc, i) => (
                  <tr key={svc.key}>
                    <td className="strong">{svc.name}</td>
                    <td><span className="money-input"><i>{form.currency}</i><input className="input mini" type="number" min="0" value={svc.from} onChange={e => setSvc(i, 'from', e.target.value)} aria-label={svc.name + ' starting price'} /></span></td>
                    <td><span className="money-input"><i>{form.currency}</i><input className="input mini" type="number" min="0" value={svc.typical} onChange={e => setSvc(i, 'typical', e.target.value)} aria-label={svc.name + ' typical job value'} /></span></td>
                    <td><Switch checked={!!svc.urgent} onChange={v => setSvc(i, 'urgent', v)} label={svc.urgent ? 'Yes' : 'When the customer says so'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card id="set-automation" title="Automation" sub="What happens without anyone touching the phone">
          <div className="switch-list">
            <Switch checked={form.aiEnabled} onChange={v => set('aiEnabled', v)} label="AI replies" hint={'The AI answers customers. When off, every reply goes to ' + form.ownerName + ' and only the first text back is automatic.'} />
            {!demo && <Switch checked={form.demoMode} onChange={v => set('demoMode', v)} label="Demo mode" hint="Log every text instead of sending it through Twilio." />}
          </div>
          <div className="form-grid">
            {text('ringSeconds', 'Ring time before a call counts as missed', 'Seconds', 'number')}
            {text('followUpMinutes', 'First nudge if no reply', 'Minutes', 'number')}
            {text('finalFollowUpHours', 'Last nudge if still no reply', 'Hours', 'number')}
            {!demo && text('claudeModel', 'Claude model', 'Used by the SMS conversation workflow')}
          </div>
        </Card>

        <Card id="set-danger" title="Demo data" sub={demo ? 'Rebuild 30 days of the sample business.' : 'Reloads the demo business in n8n. Only works while demo mode is on.'}>
          <div className="danger-row">
            <p>Clears every lead, call and message and loads the demo business again. Settings are kept.</p>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => act('reset', {}, 'Demo data rebuilt')}><ArrowCounterClockwise size={16} weight="bold" /> Reset demo data</button>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div className="save-bar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
            <span>You have unsaved changes{demo ? ' (this demo only)' : ''}</span>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(clone())}><ArrowUUpLeft size={16} weight="bold" /> Discard</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={save}><FloppyDisk size={16} weight="fill" /> Save changes</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
