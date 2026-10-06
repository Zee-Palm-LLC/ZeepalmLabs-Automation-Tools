import { useMemo } from 'react';
import { BellRinging, Clock, Phone, UsersThree, XCircle, MoonStars, Envelope, Siren } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { Card, Tag, Avatar, Switch } from '../components/ui.jsx';
import { AlertIcon } from '../components/Shell.jsx';
import { personOf, memberOf } from '../lib/metrics.js';
import { phone, shortDate, time, first } from '../lib/format.js';
import { ALERT_KIND, DAY } from '../demo/engine.js';
import { weeklyDigest } from '../demo/care.js';

function Ladder() {
  const { data } = useCare();
  const S = data.settings;
  const primary = data.circle.filter(m => m.role === 'primary');
  const backup = data.circle.filter(m => m.role === 'backup');
  const steps = [
    { at: 'On time', icon: BellRinging, title: 'Reminder', text: 'Mom gets a text listing each pill by what it looks like.' },
    { at: '+' + S.nudgeMinutes + ' min', icon: Clock, title: 'Gentle nudge', text: 'Still no reply, so one friendly follow-up.' },
    { at: '+' + S.escalateMinutes + ' min', icon: Phone, title: 'Text ' + primary.map(m => first(m.name)).join(' and '), text: 'Asks for a quick call. DONE or ON IT stops the ladder.' },
    { at: '+' + S.backupMinutes + ' min', icon: UsersThree, title: 'Text ' + backup.map(m => first(m.name)).join(' and '), text: 'Only if nobody has answered yet.' },
    { at: '+' + Math.round(S.missAfterMinutes / 60) + ' h', icon: XCircle, title: 'Marked missed', text: 'Logged for the weekly update and the doctor summary.' }
  ];
  return (
    <ol className="ladder">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.title} style={{ '--i': i }}>
            <span className="ladder-at">{s.at}</span>
            <span className="ladder-icon"><Icon size={18} weight="duotone" /></span>
            <div><b>{s.title}</b><p>{s.text}</p></div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Circle() {
  const { data, now, act, busy } = useCare();
  const S = data.settings;
  const log = data.alerts.filter(a => now - Date.parse(a.at) < 14 * DAY).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const digest = useMemo(() => weeklyDigest(data, now), [data, Math.floor(now / 60000)]);
  return (
    <div className="circle">
      <div className="members">
        {data.circle.map(m => (
          <article key={m.id} className={'member role-' + m.role}>
            <header>
              <Avatar who={m} size={48} />
              <div>
                <h3>{m.name}</h3>
                <span>{m.relation}, {m.note.charAt(0).toLowerCase() + m.note.slice(1)}</span>
              </div>
              <Tag tone={m.role === 'primary' ? 'brand' : 'quiet'}>{m.role === 'primary' ? 'First to hear' : 'Backup'}</Tag>
            </header>
            <p className="member-phone">{phone(m.phone)}{m.email ? ', ' + m.email : ''}</p>
            <p className="member-calls">Calls them {data.people.map(p => m.calls[p.id]).join(' and ')} in texts.</p>
            <div className="member-switches">
              <Switch checked={m.alerts} disabled={busy} onChange={v => act('member', { member: m.id, alerts: v }, v ? 'Alerts on for ' + first(m.name) : 'Alerts off for ' + first(m.name))} label="Text alerts" hint={m.role === 'primary' ? 'Missed doses, readings, refills' : 'Only when nobody answers, or it’s urgent'} />
              <Switch checked={m.digest} disabled={busy || !m.email} onChange={v => act('member', { member: m.id, digest: v }, 'Saved')} label="Sunday email" hint={m.email ? 'The week in pills and readings' : 'Add an email first'} />
            </div>
          </article>
        ))}
      </div>

      <div className="split">
        <Card title="When a dose goes unanswered" sub={'Quiet hours ' + S.quietStart + ':00 to ' + S.quietEnd + ':00. Only urgent texts go out then.'}>
          <Ladder />
          <p className="ladder-urgent"><Siren size={16} weight="fill" /> Chest pain, a fall, trouble breathing or an extra dose skip the ladder. Everyone is texted at once, at any hour, and Mom is told to call 911 or Poison Control.</p>
        </Card>
        <Card title="Alerts, last two weeks" sub="Who was texted and how fast someone answered" flush>
          <ul className="alog">
            {log.map(a => {
              const k = ALERT_KIND[a.kind];
              const p = personOf(data, a.personId);
              const acker = a.ackBy ? memberOf(data, a.ackBy) : null;
              const mins = a.ackAt ? Math.max(1, Math.round((Date.parse(a.ackAt) - Date.parse(a.at)) / 60000)) : null;
              return (
                <li key={a.id} className={'lvl-' + a.level}>
                  <span className="alog-icon"><AlertIcon kind={a.kind} size={15} /></span>
                  <div>
                    <b>{a.title}</b>
                    <span>{shortDate(a.at)}, {time(a.at)}. Texted {a.members.map(id => first((memberOf(data, id) || {}).name)).join(', ') || 'nobody'}</span>
                  </div>
                  <span className="alog-ans">{acker ? first(acker.name) + ' in ' + mins + ' min' : a.resolvedAt ? 'Sorted' : <Tag tone={k.tone} size="sm">Open</Tag>}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title={<span className="title-who"><Envelope size={18} weight="duotone" /> Sunday email</span>} sub={'Goes to ' + (digest.names.join(' and ') || 'nobody yet') + ' at ' + S.digestHour + ':00. This is this week’s, built from the same data.'}>
        <div className="digest">
          <div className="digest-chrome">
            <span><b>Subject</b> {digest.subject}</span>
            <span><b>To</b> {digest.to}</span>
          </div>
          <div className="digest-mail" dangerouslySetInnerHTML={{ __html: digest.html }} />
        </div>
      </Card>
    </div>
  );
}
