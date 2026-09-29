import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FloppyDisk, CircleNotch } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { PUBLIC_DEMO } from '../lib/api.js';

const FIELDS = ['gymName', 'ownerName', 'ownerEmail', 'currency', 'senderName', 'winbackOffer', 'bookingLink', 'highRiskScore', 'mediumRiskScore', 'outreachCooldownDays', 'maxOutreachPerDay', 'maxOutreachPerMember', 'demoMode'];

const pick = s => Object.fromEntries(FIELDS.map(k => [k, s[k] ?? '']));

export default function Settings() {
  const { data, saveSettings, toast } = useGym();
  const [form, setForm] = useState(() => pick(data.settings));
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => pick(data.settings), [data.settings]);

  useEffect(() => { setForm(pick(data.settings)); }, [data.settings]);

  const dirty = FIELDS.some(k => String(form[k]) !== String(saved[k]));
  const errors = {};
  if (!form.gymName.trim()) errors.gymName = 'Give your gym a name';
  if (!/^\S+@\S+\.\S+$/.test(form.ownerEmail)) errors.ownerEmail = 'Enter a valid email address';
  if (Number(form.mediumRiskScore) >= Number(form.highRiskScore)) errors.mediumRiskScore = 'Medium must be lower than high';
  if (form.bookingLink && !/^https?:\/\//.test(form.bookingLink)) errors.bookingLink = 'Start the link with https://';
  const valid = !Object.keys(errors).length;

  const set = key => e => {
    const t = e.target;
    setForm(f => ({ ...f, [key]: t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? Number(t.value) : t.value }));
  };

  const submit = async e => {
    e.preventDefault();
    if (!valid || !dirty) return;
    setSaving(true);
    try {
      await saveSettings({ ...form, demoMode: form.demoMode ? 'true' : 'false' });
    } catch (err) {
      toast('Could not save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="settings" onSubmit={submit} noValidate>
      <Section title="Your gym" note="Shown on reports and at the top of this dashboard">
        <Field label="Gym name" error={errors.gymName}><input value={form.gymName} onChange={set('gymName')} /></Field>
        <Field label="Owner first name"><input value={form.ownerName} onChange={set('ownerName')} /></Field>
        <Field label="Owner email" hint="Reports, alerts and demo emails go here" error={errors.ownerEmail}><input type="email" value={form.ownerEmail} onChange={set('ownerEmail')} /></Field>
        <Field label="Currency symbol"><input value={form.currency} onChange={set('currency')} maxLength={3} className="short" /></Field>
      </Section>

      <Section title="Win-back emails" note="Claude writes each email personally, using this offer">
        <Field label="Sender name" hint="How members see the email in their inbox"><input value={form.senderName} onChange={set('senderName')} /></Field>
        <Field label="Offer" hint="Something small and real, like a free session"><textarea rows={3} value={form.winbackOffer} onChange={set('winbackOffer')} /></Field>
        <Field label="Booking link" hint="Optional. Without one, members reply to the email" error={errors.bookingLink}><input value={form.bookingLink} onChange={set('bookingLink')} placeholder="https://" /></Field>
      </Section>

      <Section title="Risk rules" note="How the radar decides who is slipping away">
        <Slider label="High risk from score" value={form.highRiskScore} min={40} max={95} onChange={set('highRiskScore')} tone="red" />
        <Slider label="Medium risk from score" value={form.mediumRiskScore} min={15} max={80} onChange={set('mediumRiskScore')} tone="yellow" error={errors.mediumRiskScore} />
        <div className="field-row">
          <Field label="Days between emails to the same member"><input type="number" min={3} max={60} value={form.outreachCooldownDays} onChange={set('outreachCooldownDays')} className="short" /></Field>
          <Field label="Most emails per day"><input type="number" min={1} max={200} value={form.maxOutreachPerDay} onChange={set('maxOutreachPerDay')} className="short" /></Field>
          <Field label="Most emails per member"><input type="number" min={1} max={10} value={form.maxOutreachPerMember} onChange={set('maxOutreachPerMember')} className="short" /></Field>
        </div>
      </Section>

      {!PUBLIC_DEMO && <Section title="Demo mode" note="Keep this on while testing or recording a demo">
        <label className="toggle">
          <input type="checkbox" checked={!!form.demoMode} onChange={set('demoMode')} />
          <span className="toggle-track"><motion.span className="toggle-knob" layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} /></span>
          <span>
            <strong>{form.demoMode ? 'On: every email goes to the owner' : 'Off: win-back emails go to members'}</strong>
            <small className="muted">{form.demoMode ? 'Safe for testing. The Reset demo button is available.' : 'Live mode. Members receive the emails Claude writes.'}</small>
          </span>
        </label>
      </Section>}

      <AnimatePresence>
        {dirty && (
          <motion.div className="savebar" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            <span>{valid ? 'You have unsaved changes' : 'Fix the highlighted fields to save'}</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setForm(saved)}>Discard</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!valid || saving}>
              {saving ? <CircleNotch size={16} weight="bold" className="spin" /> : <FloppyDisk size={16} weight="bold" />}
              {saving ? 'Saving' : 'Save settings'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="card settings-section">
      <div className="settings-intro">
        <h2>{title}</h2>
        <p className="muted">{note}</p>
      </div>
      <div className="settings-fields">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className={'field' + (error ? ' has-error' : '')}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function Slider({ label, value, min, max, onChange, tone, error }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={'field slider tone-' + tone + (error ? ' has-error' : '')}>
      <span className="field-label">{label} <strong>{value}</strong></span>
      <input type="range" min={min} max={max} value={value} onChange={onChange} style={{ '--pct': pct + '%' }} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
