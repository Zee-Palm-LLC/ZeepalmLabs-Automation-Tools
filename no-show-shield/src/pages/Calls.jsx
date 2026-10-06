import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { PhoneCall, CheckCircle, PhoneSlash, Voicemail, PaperPlaneTilt, Info, Phone as PhoneIcon } from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, Avatar, Segmented, Empty, RiskBadge, StatusPill } from '../components/ui.jsx';
import { displayName, phone, timeLabel, providerOf, typeOf, stamp, money } from '../lib/format.js';
import { upcoming } from '../lib/metrics.js';

const WEIGHTS = [
  ['Missed a visit before', '+21 each, up to +40'],
  ['No reply to the reminder', '+22 once 3 hours have passed'],
  ['Booked weeks ahead', '+8 after 2 weeks, +14 after 4'],
  ['First visit', '+10'],
  ['Late cancellations', '+8 each, up to +16'],
  ['Monday morning or Friday afternoon', '+6'],
  ['Confirmed by text or on a call', '−46'],
  ['Reliable regular', '−12']
];

export default function Calls() {
  const { data, now, act, busy } = useDesk();
  const [filter, setFilter] = useState('call');
  const S = data.settings;
  const all = useMemo(() => upcoming(data, now, 2), [data, Math.floor(now / 20000)]);
  const groups = {
    call: all.filter(x => !x.a.confirmedAt && x.risk.score >= S.riskCallList && !x.p.optedOut),
    open: all.filter(x => !x.a.confirmedAt),
    all
  };
  const list = [...groups[filter]].sort((x, y) => y.risk.score - x.risk.score || Date.parse(x.a.start) - Date.parse(y.a.start));
  const atStake = groups.call.reduce((s, x) => s + x.a.value, 0);
  const called = all.filter(x => x.a.calledAt).length;

  return (
    <div className="calls">
      <div className="calls-top">
        <div className="calls-sum">
          <div><strong>{groups.call.length}</strong><span>to call before the next two clinic days</span></div>
          <div><strong>{money(atStake)}</strong><span>of visits riding on those calls</span></div>
          <div><strong>{groups.open.length}</strong><span>not confirmed yet in total</span></div>
          <div><strong>{called}</strong><span>calls already logged</span></div>
        </div>
      </div>
      <div className="calls-grid">
        <Card
          title="Call list"
          sub={'Score of ' + S.riskCallList + ' or more and no reply yet. Highest risk first.'}
          pad={false}
          action={<Segmented size="sm" label="Show" value={filter} onChange={setFilter} options={[{ value: 'call', label: 'Needs a call', count: groups.call.length }, { value: 'open', label: 'Not confirmed', count: groups.open.length }, { value: 'all', label: 'Everyone' }]} />}
        >
          {list.length === 0 ? (
            <Empty icon={CheckCircle} title="Nobody to call">Everyone at risk in the next two clinic days has confirmed.</Empty>
          ) : (
            <ul className="call-rows">
              <AnimatePresence initial={false}>
                {list.map(({ a, p, risk }) => (
                  <motion.li key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 40 }} className={'call-row' + (a.confirmedAt ? ' is-done' : '')}>
                    <Avatar patient={p} size={40} />
                    <div className="call-who">
                      <Link to={'/inbox/' + p.id}><strong>{displayName(p)}</strong></Link>
                      <span>{phone(p.phone)}</span>
                    </div>
                    <div className="call-visit">
                      <strong>{new Date(a.start).toLocaleDateString('en-US', { weekday: 'short' })} {timeLabel(a.start)}</strong>
                      <span>{typeOf(S, a.type).name}, {providerOf(S, a.provider).short}</span>
                    </div>
                    <div className="call-why">
                      {risk.factors.filter(f => f.points > 0).slice(0, 3).map(f => <span key={f.key} className="why-chip">{f.label}</span>)}
                      {a.calledAt && <span className="why-chip called">{a.callOutcome === 'confirmed' ? 'Confirmed on a call' : a.callOutcome === 'voicemail' ? 'Voicemail left ' + stamp(a.calledAt, now) : 'No answer ' + stamp(a.calledAt, now)}</span>}
                    </div>
                    <RiskBadge risk={risk} />
                    <div className="call-actions">
                      {a.confirmedAt ? (
                        <StatusPill appt={a} size="sm" />
                      ) : (
                        <>
                          <a className="btn btn-sm btn-soft" href={'tel:' + p.phone} aria-label={'Call ' + displayName(p)}><PhoneIcon size={13} weight="fill" /></a>
                          <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => act('confirm', { appt: a.id }, displayName(p) + ' confirmed on a call')}><CheckCircle size={14} weight="fill" /> Confirmed</button>
                          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('call', { appt: a.id, outcome: 'no_answer' }, 'Logged: no answer')} title="No answer"><PhoneSlash size={14} weight="bold" /></button>
                          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('call', { appt: a.id, outcome: 'voicemail' }, 'Logged: voicemail left')} title="Left a voicemail"><Voicemail size={14} weight="bold" /></button>
                          {!p.optedOut && <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('remind', { appt: a.id }, 'Reminder sent again')} title="Text the reminder again"><PaperPlaneTilt size={14} weight="fill" /></button>}
                        </>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
        <Card title="How the score works" sub="Plain rules you can read, not a black box" className="score-card">
          <ul className="weights">
            {WEIGHTS.map(([k, v]) => <li key={k}><span>{k}</span><b className={v.startsWith('−') ? 'down' : ''}>{v}</b></li>)}
          </ul>
          <p className="score-note"><Info size={15} weight="fill" /> Every visit starts at 14. At {S.riskCallList} or more the patient lands on this list, and the front desk gets it by email at 7:30 every clinic morning.</p>
        </Card>
      </div>
    </div>
  );
}
