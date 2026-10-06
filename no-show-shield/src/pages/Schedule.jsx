import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CaretLeft, CaretRight, PaperPlaneTilt, PhoneCall, CheckCircle, UserMinus, CalendarX, Chair, ChatsCircle, ArrowsClockwise, X, Bell, Check
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { Card, Avatar, StatusPill, RiskBadge, Empty, Segmented } from '../components/ui.jsx';
import { Lanes } from '../components/charts.jsx';
import { RiskMeter } from '../components/Risk.jsx';
import OfferBoard from '../components/OfferBoard.jsx';
import { displayName, timeLabel, providerOf, typeOf, phone, stamp, longDate, money, apptStatus } from '../lib/format.js';
import { indexes, scheduleDay, dayAppts, workdays } from '../lib/metrics.js';
import { riskOf, dayStart } from '../demo/engine.js';

export default function Schedule() {
  const { data, now } = useDesk();
  const [params, setParams] = useSearchParams();
  const S = data.settings;
  const ix = useMemo(() => indexes(data), [data]);
  const preset = params.get('appt') ? ix.appts[params.get('appt')] : null;
  const [day, setDay] = useState(() => (preset ? dayStart(Date.parse(preset.start)) : scheduleDay(data, now)));
  const [sel, setSel] = useState(preset ? preset.id : null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (preset) {
      setDay(dayStart(Date.parse(preset.start)));
      setSel(preset.id);
    }
  }, [params]);

  const days = useMemo(() => [...workdays(now, 3), ...workdays(now, 10, false).filter(d => d > dayStart(now))].slice(0, 12), [Math.floor(now / 3600000)]);
  const appts = dayAppts(data, day).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const withRisk = appts.map(a => ({ a, p: ix.patients[a.patientId], risk: riskOf(a, ix.patients[a.patientId], now, S) }));
  const shown = withRisk.filter(x => filter === 'all' || (filter === 'unconfirmed' && x.a.status === 'booked') || (filter === 'risk' && x.a.status === 'booked' && x.risk.level !== 'low'));
  const selected = sel ? ix.appts[sel] : null;
  const stepDay = dir => {
    const i = days.indexOf(day);
    const next = days[Math.max(0, Math.min(days.length - 1, i + dir))];
    if (next) setDay(next);
  };
  const pick = a => {
    setSel(a.id);
    setParams({ appt: a.id }, { replace: true });
  };
  const close = () => {
    setSel(null);
    setParams({}, { replace: true });
  };

  const render = a => {
    const p = ix.patients[a.patientId];
    const r = riskOf(a, p, now, S);
    let cls = 'b-' + a.status;
    if (a.status === 'booked' && r.level === 'high') cls = 'b-risk';
    if (a.status === 'cancelled') cls = 'b-open';
    if (a.source === 'waitlist' && a.status !== 'no_show') cls += ' b-fromwait';
    const label = a.status === 'cancelled'
      ? <><b>Open</b><em>{a.offerId ? 'Offered' : 'Free'}</em></>
      : <><b>{p.name}</b><em>{typeOf(S, a.type).name}</em></>;
    return { cls, label, title: displayName(p) + ', ' + timeLabel(a.start) };
  };

  return (
    <div className="sched">
      <div className="daystrip" role="tablist" aria-label="Clinic days">
        <button type="button" className="icon-btn" onClick={() => stepDay(-1)} aria-label="Previous day"><CaretLeft size={16} weight="bold" /></button>
        <div className="daystrip-days">
          {days.map(d => {
            const list = dayAppts(data, d).filter(a => a.status !== 'cancelled');
            const conf = list.filter(a => a.status === 'confirmed' || a.status === 'completed' || a.status === 'arrived').length;
            const isToday = d === dayStart(now);
            const past = d < dayStart(now);
            return (
              <button key={d} type="button" role="tab" aria-selected={d === day} className={'day-chip' + (d === day ? ' on' : '') + (past ? ' past' : '')} onClick={() => setDay(d)}>
                {d === day && <motion.span layoutId="day-on" className="day-thumb" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="day-wd">{isToday ? 'Today' : new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <strong>{new Date(d).getDate()}</strong>
                <span className="day-fill"><i style={{ width: (list.length ? conf / list.length : 0) * 100 + '%' }} /></span>
                <em>{list.length} visits</em>
              </button>
            );
          })}
        </div>
        <button type="button" className="icon-btn" onClick={() => stepDay(1)} aria-label="Next day"><CaretRight size={16} weight="bold" /></button>
      </div>

      <div className={'sched-grid' + (selected ? ' has-detail' : '')}>
        <div className="sched-main">
          <Card
            className="lanes-card"
            title={longDate(day)}
            sub={appts.filter(a => a.status !== 'cancelled').length + ' visits, ' + appts.filter(a => a.status === 'confirmed').length + ' confirmed, ' + withRisk.filter(x => x.a.status === 'booked' && x.risk.level === 'high').length + ' high risk'}
            action={
              <ul className="chairs-legend">
                <li><i className="lg-confirmed" />Confirmed</li>
                <li><i className="lg-booked" />Not yet</li>
                <li><i className="lg-risk" />High risk</li>
                <li><i className="lg-done" />Seen</li>
                <li><i className="lg-noshow" />No-show</li>
                <li><i className="lg-wait" />From waitlist</li>
              </ul>
            }
          >
            <Lanes appts={appts} providers={S.providers} day={day} now={now} open={S.openHour} close={S.closeHour} lunch={S.lunchHour} render={render} onPick={pick} selected={sel} />
          </Card>

          <Card
            title="Agenda"
            sub="Sorted by time. Risk updates as replies come in."
            pad={false}
            action={<Segmented size="sm" label="Show" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'unconfirmed', label: 'Not confirmed', count: withRisk.filter(x => x.a.status === 'booked').length }, { value: 'risk', label: 'At risk' }]} />}
          >
            {shown.length === 0 ? (
              <Empty icon={Chair} title="Nothing to show">No visits match this filter.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Time</th><th>Patient</th><th>Visit</th><th>Status</th><th>Reminders</th><th className="num">Risk</th></tr>
                  </thead>
                  <tbody>
                    {shown.map(({ a, p, risk }) => (
                      <tr key={a.id} className={sel === a.id ? 'on' : ''} onClick={() => pick(a)}>
                        <td className="mono">{timeLabel(a.start)}</td>
                        <td><span className="cell-who"><Avatar patient={p} size={28} /><span><strong>{displayName(p)}</strong><em>{p.visits ? p.visits + ' visits' : 'New patient'}</em></span></span></td>
                        <td><span className="cell-two"><strong>{typeOf(S, a.type).name}</strong><em>{providerOf(S, a.provider).short}, {a.minutes} min</em></span></td>
                        <td><StatusPill appt={a} size="sm" /></td>
                        <td><Reminders a={a} /></td>
                        <td className="num">{a.status === 'cancelled' ? '' : <RiskBadge risk={risk} size="sm" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <AnimatePresence>
          {selected && <Detail key={selected.id} a={selected} onClose={close} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Reminders({ a }) {
  const r = a.reminders || {};
  const keys = [['first', '3 days'], ['second', '1 day'], ['final', '2 hours']];
  return (
    <span className="rem-dots">
      {keys.map(([k, label]) => <i key={k} className={r[k] ? 'sent' : ''} title={label + (r[k] ? ' reminder sent' : ' reminder not sent yet')} />)}
      {a.confirmedAt && <Check size={12} weight="bold" className="rem-ok" />}
    </span>
  );
}

function Detail({ a, onClose }) {
  const { data, now, act, busy } = useDesk();
  const S = data.settings;
  const p = data.patients.find(x => x.id === a.patientId);
  const risk = riskOf(a, p, now, S);
  const upcoming = Date.parse(a.start) > now;
  const live = a.status === 'booked' || a.status === 'confirmed' || a.status === 'arrived';
  const offer = a.offerId ? data.offers.find(o => o.id === a.offerId) : null;
  const msgs = data.messages.filter(m => m.patientId === p.id && m.dir !== 'note' && Date.parse(m.at) <= now).slice(-3);
  const r = a.reminders || {};
  const filledBy = a.filledBy ? data.appts.find(x => x.id === a.filledBy) : null;
  const filler = filledBy ? data.patients.find(x => x.id === filledBy.patientId) : null;
  return (
    <motion.aside className="detail" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} aria-label="Visit details">
      <div className="detail-head">
        <Avatar patient={p} size={44} />
        <div>
          <strong>{displayName(p)}</strong>
          <span>{phone(p.phone)}{p.optedOut ? ', opted out of texts' : ''}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details"><X size={18} /></button>
      </div>
      <div className="detail-visit">
        <div className="dv-row"><span>When</span><b>{new Date(a.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {timeLabel(a.start)}</b></div>
        <div className="dv-row"><span>Visit</span><b>{typeOf(S, a.type).name}, {a.minutes} min</b></div>
        <div className="dv-row"><span>With</span><b>{providerOf(S, a.provider).name}</b></div>
        <div className="dv-row"><span>Value</span><b>{money(a.value)}</b></div>
        <div className="dv-row"><span>Status</span><StatusPill appt={a} size="sm" /></div>
        <div className="dv-row"><span>Booked</span><b>{stamp(a.bookedAt, now)}{a.source === 'waitlist' ? ', from the waitlist' : a.source === 'text' ? ', by text' : ''}</b></div>
      </div>
      {filler && <p className="detail-note"><ArrowsClockwise size={15} weight="bold" /> Refilled by {displayName(filler)} from the waitlist.</p>}
      {live && <RiskMeter risk={risk} />}
      <div className="detail-rem">
        <span className="stage-label">Reminders</span>
        <ul>
          {[['first', S.reminderFirst + ' hours before'], ['second', S.reminderSecond + ' hours before'], ['final', S.reminderFinal + ' hours before']].map(([k, label]) => (
            <li key={k} className={r[k] ? 'sent' : ''}><Bell size={13} weight={r[k] ? 'fill' : 'regular'} /><span>{label}</span><em>{r[k] ? 'Sent ' + stamp(r[k], now) : 'Not sent'}</em></li>
          ))}
          {a.confirmedAt && <li className="sent ok"><CheckCircle size={13} weight="fill" /><span>Confirmed {a.confirmedBy === 'call' ? 'on a call' : a.confirmedBy === 'offer' ? 'from an offer' : a.confirmedBy === 'move' ? 'when moved' : 'by text'}</span><em>{stamp(a.confirmedAt, now)}</em></li>}
        </ul>
      </div>
      {offer && <OfferBoard offer={offer} compact />}
      {msgs.length > 0 && (
        <div className="detail-msgs">
          <span className="stage-label">Latest texts</span>
          {msgs.map(m => <p key={m.id} className={'mini-bubble ' + (m.dir === 'in' ? 'in' : 'out')}>{m.body}</p>)}
          <Link to={'/inbox/' + p.id} className="link-btn"><ChatsCircle size={14} weight="bold" /> Open the conversation</Link>
        </div>
      )}
      <div className="detail-actions">
        {upcoming && live && !p.optedOut && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => act('remind', { appt: a.id }, 'Reminder sent to ' + displayName(p))}><PaperPlaneTilt size={14} weight="fill" /> Send reminder now</button>}
        {upcoming && a.status === 'booked' && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => act('confirm', { appt: a.id }, displayName(p) + ' confirmed on a call')}><PhoneCall size={14} weight="fill" /> Confirmed on a call</button>}
        {!upcoming && (a.status === 'booked' || a.status === 'confirmed') && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => act('outcome', { appt: a.id, status: 'arrived' }, displayName(p) + ' checked in')}><CheckCircle size={14} weight="fill" /> Checked in</button>}
        {a.status === 'arrived' && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => act('outcome', { appt: a.id, status: 'completed' }, 'Visit completed')}><Check size={14} weight="bold" /> Visit done</button>}
        {!upcoming && (a.status === 'booked' || a.status === 'confirmed') && <button type="button" className="btn btn-ghost btn-sm danger" disabled={busy} onClick={() => act('outcome', { appt: a.id, status: 'no_show' }, 'Marked as a no-show')}><UserMinus size={14} weight="bold" /> No-show</button>}
        {upcoming && live && <button type="button" className="btn btn-ghost btn-sm danger" disabled={busy} onClick={() => act('cancel', { appt: a.id }, S.autoFill ? 'Cancelled. The time was offered to the waitlist' : 'Cancelled')}><CalendarX size={14} weight="bold" /> Cancel and offer to waitlist</button>}
        {a.status === 'cancelled' && !a.filledBy && !(offer && offer.status === 'open') && upcoming && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => act('offer', { appt: a.id }, 'Offered to the waitlist')}><ArrowsClockwise size={14} weight="bold" /> Offer to the waitlist</button>}
      </div>
    </motion.aside>
  );
}
