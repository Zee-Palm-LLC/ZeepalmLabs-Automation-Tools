import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FloppyDisk, ArrowCounterClockwise, Buildings, Bell, ArrowsClockwise, ShieldCheck, Robot, Warning, ArrowUUpLeft, Gauge, FirstAidKit } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, Switch } from '../components/ui.jsx';
import { fill, nextWorkday, atTime } from '../demo/engine.js';

const SECTIONS = [
  { id: 'clinic', label: 'Clinic', icon: Buildings },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'waitlist', label: 'Waitlist', icon: ArrowsClockwise },
  { id: 'risk', label: 'Risk score', icon: Gauge },
  { id: 'privacy', label: 'Privacy and safety', icon: ShieldCheck },
  { id: 'ai', label: 'AI', icon: Robot },
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
  const { data, act, busy, demo, now } = useDesk();
  const clone = () => JSON.parse(JSON.stringify(data.settings));
  const [form, setForm] = useState(clone);
  const [active, setActive] = useState('clinic');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
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
    for (const [k, v] of Object.entries(form)) if (JSON.stringify(v) !== JSON.stringify(data.settings[k])) params[k] = typeof v === 'object' ? JSON.stringify(v) : v;
    act('settings', params, 'Settings saved');
  };

  const jump = id => {
    setActive(id);
    const el = document.getElementById('set-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const text = (k, label, hint, type = 'text') => (
    <Field label={label} hint={hint}>
      <input className="input" type={type} value={form[k] ?? ''} onChange={e => set(k, type === 'number' ? Number(e.target.value) : e.target.value)} />
    </Field>
  );

  const sampleStart = atTime(nextWorkday(now, 1), 10, 30);
  const vars = {
    first: 'Sam',
    clinic: form.shortName,
    when: 'tomorrow, ' + new Date(sampleStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at 10:30 AM',
    time: '10:30 AM',
    provider: 'Lena',
    address: form.address
  };

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
        <Card id="set-clinic" title="Clinic" sub="Shown in texts and used for the front desk email">
          <div className="form-grid">
            {text('clinicName', 'Clinic name')}
            {text('shortName', 'Name used in texts', 'Keep it short so reminders fit in one text')}
            {text('frontDeskName', 'Front desk lead')}
            {text('frontDeskPhone', 'Front desk line', 'Health concerns and call-back requests are texted here', 'tel')}
            {text('frontDeskEmail', 'Front desk email', 'The 7:30 call list and failure alerts go here', 'email')}
            {text('clinicPhone', 'Texting number', 'The Twilio number patients see', 'tel')}
            {text('address', 'Address', 'Used in the 2-hour reminder')}
            {text('timezone', 'Time zone', 'Reminder times and quiet hours use this zone')}
            {text('parking', 'Parking', 'The AI uses this when patients ask')}
          </div>
        </Card>

        <Card id="set-reminders" title="Reminders" sub="Three texts before each visit. {first}, {when}, {time}, {provider}, {clinic} and {address} are filled in for you.">
          <div className="form-grid three">
            {text('reminderFirst', 'First reminder', 'Hours before the visit', 'number')}
            {text('reminderSecond', 'Second reminder', 'Hours before the visit', 'number')}
            {text('reminderFinal', 'Last reminder', 'Hours before the visit', 'number')}
          </div>
          <div className="msg-grid">
            {[['templateFirst', 'First reminder'], ['templateSecond', 'Second reminder'], ['templateFinal', 'Last reminder'], ['templateOffer', 'Waitlist offer']].map(([k, label]) => (
              <div key={k} className="msg-edit">
                <Field label={label}>
                  <textarea className="input" rows={4} value={form[k]} onChange={e => set(k, e.target.value)} />
                </Field>
                <div className="msg-preview" aria-label="Preview">
                  <span className="field-label">Preview</span>
                  <div className="mini-phone">
                    <span className="mini-sender">{form.shortName}</span>
                    <p className="bubble them">{fill(form[k], vars)}</p>
                    <span className="mini-meta">{fill(form[k], vars).length} characters{fill(form[k], vars).length > 160 ? ', two texts' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card id="set-waitlist" title="Waitlist" sub="What happens when a patient cancels or moves">
          <div className="switch-list">
            <Switch checked={form.autoFill} onChange={v => set('autoFill', v)} label="Offer freed times automatically" hint="When off, freed times stay open until someone at the front desk offers them." />
          </div>
          <div className="form-grid">
            {text('offerBatch', 'Patients texted per opening', 'The best matches get the offer at the same time', 'number')}
            {text('offerMinutes', 'Offer stays open for', 'Minutes', 'number')}
            {text('minNoticeHours', 'Skip openings sooner than', 'Hours. Too short notice for most patients', 'number')}
          </div>
        </Card>

        <Card id="set-risk" title="Risk score" sub="Who lands on the call list">
          <div className="form-grid">
            {text('riskCallList', 'Call list threshold', 'Visits scoring this or more without a reply go on the call list', 'number')}
            <Field label="No-show rate before" hint="Used to work out how many no-shows were avoided">
              <input className="input" type="number" step="0.01" min="0" max="1" value={form.baselineNoShowRate} onChange={e => set('baselineNoShowRate', Number(e.target.value))} />
            </Field>
          </div>
        </Card>

        <Card id="set-privacy" title="Privacy and safety" sub="Texts are not a secure channel, so they say as little as possible">
          <div className="switch-list">
            <Switch checked={form.minimumNecessary} onChange={v => set('minimumNecessary', v)} label="Keep treatment out of texts" hint="Reminders name the time and the provider, never the treatment." />
          </div>
          <div className="form-grid">
            {text('quietStart', 'No texts after', 'Hour of the day, 24-hour clock', 'number')}
            {text('quietEnd', 'No texts before', 'Hour of the day, 24-hour clock', 'number')}
          </div>
          <div className="safety-box">
            <FirstAidKit size={20} weight="duotone" />
            <div>
              <strong>Health concerns always go to a person</strong>
              <p>When a patient mentions pain, swelling, bleeding, medicine or anything that sounds clinical, the AI gives no advice. It tells them a clinician will call, points them to 911 if it feels like an emergency, and texts the front desk line. This can't be switched off.</p>
            </div>
          </div>
        </Card>

        <Card id="set-ai" title="AI" sub="How patient replies are read">
          <div className="switch-list">
            <Switch checked={form.aiEnabled} onChange={v => set('aiEnabled', v)} label="AI replies" hint="When off, reminders still go out, but every reply waits for the front desk." />
            {!demo && <Switch checked={form.demoMode} onChange={v => set('demoMode', v)} label="Demo mode" hint="Log every text instead of sending it through Twilio." />}
          </div>
          <div className="form-grid">
            {text('insurers', 'Insurance plans you take', 'Comma separated. The AI answers insurance questions from this list')}
            {!demo && text('claudeModel', 'Claude model', 'Used by the reply workflow')}
          </div>
        </Card>

        <Card id="set-danger" title="Demo data" sub={demo ? 'Rebuild 30 days of the sample clinic.' : 'Reloads the demo clinic in n8n. Only works while demo mode is on.'}>
          <div className="danger-row">
            <p>Clears every appointment, message and waitlist entry and loads the demo clinic again. Settings are kept.</p>
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
