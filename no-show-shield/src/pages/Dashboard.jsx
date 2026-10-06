import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Play, PhoneCall, CalendarCheck, CalendarX, ArrowsClockwise, CurrencyDollar, ChatCircle, FirstAidKit, ListNumbers, UserMinus, CheckCircle, Timer, ArrowRight, ShieldCheck
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Card, CountUp, Delta, Segmented, Avatar, Empty, RiskBadge } from '../components/ui.jsx';
import { Sparkline, DailyChart, Donut, Funnel, Lanes } from '../components/charts.jsx';
import { money, pct, ago, displayName, seconds, longDate, timeLabel, providerOf, typeOf, INTENT } from '../lib/format.js';
import { dailySeries, trend, intentMix, callList, activity, scheduleDay, dayAppts, indexes } from '../lib/metrics.js';
import { riskOf } from '../demo/engine.js';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

export default function Dashboard() {
  const { data, now } = useDesk();
  const minute = Math.floor(now / 60000);
  const series = useMemo(() => dailySeries(data, now), [data, minute]);

  return (
    <motion.div className="dash" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise}><Hero /></motion.div>
      <motion.div className="kpis" variants={rise}><Kpis series={series} /></motion.div>
      <motion.div variants={rise}><Chairs /></motion.div>
      <motion.div className="dash-row two-one" variants={rise}>
        <ChartCard series={series} />
        <Replies />
      </motion.div>
      <motion.div className="dash-row three" variants={rise}>
        <CallPreview />
        <ActivityFeed />
        <Backfill />
      </motion.div>
    </motion.div>
  );
}

function Hero() {
  const { data, stats: st } = useDesk();
  const { setStageOpen } = useUi();
  const navigate = useNavigate();
  const s = data.settings;
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const drop = st.baseline ? 1 - st.noShowRate / st.baseline : 0;
  return (
    <section className="hero">
      <div className="hero-mesh" aria-hidden="true" />
      <div className="hero-main">
        <span className="hero-hello">{hello}, {s.frontDeskName}</span>
        <h2>
          <span className="hero-money"><CountUp value={st.avoided} duration={1.4} /> no-shows</span> avoided this month, worth <CountUp value={st.protectedValue} format={v => money(v)} duration={1.6} /> with the waitlist refills.
        </h2>
        <p>{st.textConfirmed} patients confirmed by text and {st.filled} cancelled times were refilled from the waitlist, a median of {seconds(st.medianFill)} after they opened up. Nobody had to pick up the phone for those.</p>
        <div className="hero-cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setStageOpen(true)}>
            <span className="call-ping" aria-hidden="true" />
            <Play size={16} weight="fill" /> Try it as a patient
          </button>
          <button type="button" className="btn btn-glass btn-lg" onClick={() => navigate('/calls')}>
            <PhoneCall size={17} weight="duotone" /> Open the call list
          </button>
        </div>
      </div>
      <div className="hero-side">
        <div className="ba" role="img" aria-label={'No-show rate fell from ' + pct(st.baseline) + ' to ' + pct(st.noShowRate, 1)}>
          <div className="ba-col">
            <div className="ba-bar"><motion.i className="ba-before" initial={{ height: 0 }} animate={{ height: '100%' }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} /></div>
            <strong>{pct(st.baseline)}</strong>
            <span>Before</span>
          </div>
          <div className="ba-col">
            <div className="ba-bar"><motion.i className="ba-after" initial={{ height: 0 }} animate={{ height: Math.max(4, (st.noShowRate / st.baseline) * 100) + '%' }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} /></div>
            <strong><CountUp value={st.noShowRate * 100} format={v => v.toFixed(1) + '%'} /></strong>
            <span>Last 30 days</span>
          </div>
        </div>
        <div className="ba-copy">
          <ShieldCheck size={20} weight="duotone" />
          <p><b>{pct(drop)} fewer no-shows</b> than the 90 days before reminders and the waitlist were switched on.</p>
        </div>
      </div>
    </section>
  );
}

function Kpis({ series }) {
  const { stats: st } = useDesk();
  return (
    <>
      <Kpi icon={UserMinus} tone="red" label="No-show rate" value={st.noShowRate * 100} format={v => v.toFixed(1) + '%'} deltaValue={st.baseline ? st.noShowRate / st.baseline - 1 : null} invert spark={series.rate} sub={st.noShows + ' missed of ' + st.seen + ', against ' + pct(st.baseline) + ' before'} />
      <Kpi icon={CalendarCheck} tone="green" label="Confirmed ahead" value={st.confirmRate * 100} format={v => Math.round(v) + '%'} deltaValue={trend(series.kept)} spark={series.kept} sub={st.textConfirmed + ' by text, the rest by phone'} />
      <Kpi icon={ArrowsClockwise} tone="blue" label="Refilled from waitlist" value={st.filled} deltaValue={trend(series.refilled)} spark={series.refilled} sub={'of ' + st.freed + ' cancelled or moved times'} />
      <Kpi icon={CurrencyDollar} tone="violet" label="Revenue protected" value={st.protectedValue} format={v => money(v)} deltaValue={trend(series.saved)} spark={series.saved} sub={money(st.refillValue) + ' from refills alone'} />
    </>
  );
}

function Kpi({ icon: Icon, tone, label, value, format, deltaValue, invert, spark, sub }) {
  const color = { red: 'var(--red)', blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)' }[tone];
  return (
    <div className={'kpi kpi-' + tone}>
      <div className="kpi-top">
        <span className="kpi-icon"><Icon size={17} weight="fill" /></span>
        <span className="kpi-label">{label}</span>
        <Delta value={deltaValue} invert={invert} />
      </div>
      <strong className="kpi-value"><CountUp value={value} format={format} /></strong>
      <div className="kpi-foot"><span>{sub}</span></div>
      <Sparkline data={spark} color={color} height={42} />
    </div>
  );
}

function Chairs() {
  const { data, now } = useDesk();
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const S = data.settings;
  const day = scheduleDay(data, now);
  const ix = useMemo(() => indexes(data), [data]);
  const appts = dayAppts(data, day).filter(a => a.status !== 'cancelled');
  const isToday = new Date(day).toDateString() === new Date(now).toDateString();
  const counts = { confirmed: 0, risky: 0, waiting: 0 };
  const render = a => {
    const p = ix.patients[a.patientId];
    const r = riskOf(a, p, now, S);
    let cls = 'b-' + a.status;
    if ((a.status === 'booked') && r.level === 'high') cls = 'b-risk';
    if (a.source === 'waitlist' && a.status !== 'no_show') cls += ' b-fromwait';
    return { cls, label: <><b>{p.name.split(' ')[0]}</b><em>{timeLabel(a.start).replace(':00', '')}</em></>, title: displayName(p) + ', ' + timeLabel(a.start) };
  };
  for (const a of appts) {
    if (a.status === 'confirmed') counts.confirmed += 1;
    else if (a.status === 'booked') {
      if (riskOf(a, ix.patients[a.patientId], now, S).level === 'high') counts.risky += 1;
      else counts.waiting += 1;
    }
  }
  return (
    <Card
      className="chairs-card"
      title={(isToday ? 'Today' : 'Next clinic day') + ', ' + longDate(day)}
      sub={appts.length + ' visits across ' + S.providers.length + ' chairs. Click a visit to open it in the schedule.'}
      action={
        <ul className="chairs-legend">
          <li><i className="lg-confirmed" />{counts.confirmed} confirmed</li>
          <li><i className="lg-booked" />{counts.waiting} not yet</li>
          <li><i className="lg-risk" />{counts.risky} high risk</li>
          <li><i className="lg-wait" />From waitlist</li>
        </ul>
      }
    >
      <Lanes
        appts={appts}
        providers={S.providers}
        day={day}
        now={now}
        open={S.openHour}
        close={S.closeHour}
        lunch={S.lunchHour}
        render={render}
        onPick={a => navigate('/schedule?appt=' + a.id)}
        selected={hover}
      />
    </Card>
  );
}

function ChartCard({ series }) {
  const { data } = useDesk();
  const [mode, setMode] = useState('visits');
  return (
    <Card
      className="chart-card"
      title={mode === 'visits' ? 'Visits kept, refilled and missed' : 'No-show rate'}
      sub={mode === 'visits' ? 'Each bar is a clinic day over the last month' : 'Three-day rolling rate, against the rate before reminders were switched on'}
      action={<Segmented size="sm" label="Chart" value={mode} onChange={setMode} options={[{ value: 'visits', label: 'Visits' }, { value: 'rate', label: 'No-show rate' }]} />}
    >
      <DailyChart series={series} mode={mode} baseline={data.settings.baselineNoShowRate} />
      <div className="chart-legend">
        {mode === 'visits' ? (
          <>
            <span><i className="sw sw-kept" /> Kept</span>
            <span><i className="sw sw-refill" /> Refilled from the waitlist</span>
            <span><i className="sw sw-noshow" /> No-show</span>
          </>
        ) : (
          <>
            <span><i className="sw sw-rate" /> No-show rate</span>
            <span><i className="sw sw-base" /> Before No-Show Shield</span>
          </>
        )}
      </div>
    </Card>
  );
}

const MIX = ['confirm', 'reschedule', 'cancel', 'question', 'clinical', 'late', 'callback', 'accept'];

function Replies() {
  const { data, now } = useDesk();
  const minute = Math.floor(now / 60000);
  const counts = useMemo(() => intentMix(data, now), [data, minute]);
  const items = MIX.filter(k => counts[k]).map(k => ({ key: k, name: INTENT[k].label, value: counts[k] })).sort((a, b) => b.value - a.value);
  return (
    <Card title="What patients texted back" sub="How the AI read each reply in the last 30 days">
      {items.length ? <Donut items={items} totalLabel="replies understood" /> : <Empty icon={ChatCircle} title="No replies yet" />}
    </Card>
  );
}

function CallPreview() {
  const { data, now, act, busy } = useDesk();
  const list = useMemo(() => callList(data, now).slice(0, 4), [data, Math.floor(now / 60000)]);
  return (
    <Card title="Call these first" sub="High risk and no reply to the reminder" action={<Link className="link-btn" to="/calls">Call list <ArrowRight size={13} weight="bold" /></Link>}>
      {list.length === 0 ? (
        <Empty icon={CheckCircle} title="Nobody to call">Every high-risk patient for the next two clinic days has confirmed.</Empty>
      ) : (
        <ul className="needs">
          <AnimatePresence initial={false}>
            {list.map(({ a, p, risk }) => (
              <motion.li key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }} className="need">
                <Avatar patient={p} size={38} />
                <div className="need-text">
                  <Link to={'/inbox/' + p.id}><strong>{displayName(p)}</strong></Link>
                  <span>{timeLabel(a.start)} {new Date(a.start).toLocaleDateString('en-US', { weekday: 'short' })}, {risk.factors[0] ? risk.factors[0].label.toLowerCase() : ''}</span>
                </div>
                <div className="need-actions">
                  <RiskBadge risk={risk} size="sm" />
                  <button type="button" className="btn btn-sm btn-soft" disabled={busy} onClick={() => act('confirm', { appt: a.id }, displayName(p) + ' confirmed on a call')}>Confirmed</button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}

const FEED = {
  confirm: { icon: CalendarCheck, tone: 'green', title: 'Confirmed' },
  moved: { icon: ListNumbers, tone: 'blue', title: 'Moved by text' },
  filled: { icon: ArrowsClockwise, tone: 'green', title: 'Booked from the waitlist' },
  offered: { icon: ArrowsClockwise, tone: 'cyan', title: 'Offered to the waitlist' },
  cancelled: { icon: CalendarX, tone: 'amber', title: 'Cancelled' },
  flag: { icon: FirstAidKit, tone: 'red', title: 'Needs a person' },
  late: { icon: Timer, tone: 'violet', title: 'Running late' },
  reply: { icon: ChatCircle, tone: 'violet', title: 'Patient texted' }
};

function ActivityFeed() {
  const { data, now } = useDesk();
  const items = useMemo(() => activity(data, now, 8), [data, now]);
  return (
    <Card title="Live activity" sub="Every reply and every change, as it happens" action={<span className="live-chip"><span className="live-dot" /> Live</span>} className="feed-card">
      <ul className="feed">
        <AnimatePresence initial={false}>
          {items.map(e => {
            const f = FEED[e.kind] || FEED.reply;
            const Icon = f.icon;
            return (
              <motion.li key={e.id} layout initial={{ opacity: 0, x: -12, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <Link to={e.patient ? '/inbox/' + e.patient.id : '/inbox'} className="feed-item">
                  <span className={'feed-icon t-' + f.tone}><Icon size={14} weight="fill" /></span>
                  <span className="feed-text">
                    <strong>{e.patient ? displayName(e.patient) : f.title}</strong>
                    <span>{e.kind === 'reply' ? '“' + e.text + '”' : e.text}</span>
                  </span>
                  <em>{ago(e.at, now)}</em>
                </Link>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

function Backfill() {
  const { stats: st, data } = useDesk();
  const texted = data.offers.reduce((a, o) => a + o.candidates.length, 0);
  const replied = data.offers.reduce((a, o) => a + o.candidates.filter(c => c.reply).length, 0);
  return (
    <Card title="Waitlist backfill" sub="When a time opens up, the best matches get a text" action={<Link className="link-btn" to="/waitlist">Waitlist <ArrowRight size={13} weight="bold" /></Link>}>
      <Funnel steps={[
        { label: 'Times freed by a cancel or move', value: st.freed },
        { label: 'Offered to the waitlist', value: st.offers },
        { label: 'Refilled', value: st.filled }
      ]} />
      <div className="mini-stats">
        <div><strong>{seconds(st.medianFill)}</strong><span>median time to refill</span></div>
        <div><strong>{texted ? pct(replied / texted) : '0%'}</strong><span>of offers got a reply</span></div>
      </div>
    </Card>
  );
}
