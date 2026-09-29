import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Phone, ArrowRight, PhoneX, ChatText, ChatCircle, CalendarCheck, Siren, PhoneCall, Check, CurrencyDollar, Lightning, ChatsCircle
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Card, CountUp, Delta, Segmented, Avatar, Empty, StatusPill } from '../components/ui.jsx';
import { Sparkline, DailyChart, Donut, Funnel, Ring } from '../components/charts.jsx';
import { money, pct, ago, displayName, needsYou, STATUS, phone } from '../lib/format.js';
import { dailySeries, delta, ratioDelta, serviceMix, medianMinutesToBook, activity } from '../lib/metrics.js';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

export default function Dashboard() {
  const { data, now } = useDesk();
  const minute = Math.floor(now / 60000);
  const series = useMemo(() => dailySeries(data, now), [data, minute]);
  const mix = useMemo(() => serviceMix(data, now), [data, minute]);
  const median = useMemo(() => medianMinutesToBook(data, now), [data, minute]);
  const st = data.stats;
  const cur = data.settings.currency;

  return (
    <motion.div className="dash" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise}><Hero median={median} /></motion.div>
      <motion.div className="kpis" variants={rise}>
        <Kpi icon={PhoneX} tone="red" label="Missed calls" value={st.missed} deltaValue={delta(series.missed)} invert spark={series.missed} sub={st.afterHours + ' after hours'} />
        <Kpi icon={ChatText} tone="blue" label="Texted back" value={st.texted} deltaValue={delta(series.texted)} spark={series.texted} sub={'in ' + st.avgTextBack + 's on average'} />
        <Kpi icon={ChatCircle} tone="violet" label="Reply rate" value={st.replyRate * 100} format={v => Math.round(v) + '%'} deltaValue={ratioDelta(series.replied, series.texted)} points spark={series.replied} sub={st.replied + ' customers replied'} />
        <Kpi icon={CurrencyDollar} tone="green" label="Won back" value={st.recovered} format={v => money(v, cur)} deltaValue={delta(series.revenue)} spark={series.revenue} sub={st.booked + ' jobs booked'} />
      </motion.div>
      <motion.div className="dash-row two-one" variants={rise}>
        <ChartCard series={series} />
        <Card title="From missed call to booked job" sub="Last 30 days">
          <Funnel steps={[
            { label: 'Calls nobody answered', value: st.missed },
            { label: 'Texted back', value: st.texted },
            { label: 'Customer replied', value: st.replied },
            { label: 'Job booked', value: st.booked }
          ]} />
        </Card>
      </motion.div>
      <motion.div className="dash-row three" variants={rise}>
        <ActivityFeed />
        <NeedsYou />
        <Card title="Revenue by service" sub="Jobs booked from missed calls">
          {mix.length ? <Donut items={mix} currency={cur} /> : <Empty icon={CurrencyDollar} title="No bookings yet" />}
        </Card>
      </motion.div>
      <motion.div variants={rise}><CallBoard /></motion.div>
    </motion.div>
  );
}

function Hero({ median }) {
  const { data } = useDesk();
  const { setStageOpen } = useUi();
  const navigate = useNavigate();
  const st = data.stats;
  const s = data.settings;
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <section className="hero">
      <div className="hero-mesh" aria-hidden="true" />
      <div className="hero-main">
        <span className="hero-hello">{hello}, {s.ownerName}</span>
        <h2>
          <span className="hero-money"><CountUp value={st.recovered} format={v => money(v, s.currency)} duration={1.6} /></span> won back from calls nobody could answer.
        </h2>
        <p>{st.booked} jobs booked from {st.missed} missed calls in the last 30 days. When the AI books a job, it takes a median of {median} minutes from the missed call.</p>
        <div className="hero-cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setStageOpen(true)}>
            <span className="call-ping" aria-hidden="true" />
            <Phone size={17} weight="fill" /> Call the demo line
          </button>
          <button type="button" className="btn btn-glass btn-lg" onClick={() => navigate('/inbox')}>
            <ChatsCircle size={17} weight="duotone" /> Open the inbox
          </button>
        </div>
      </div>
      <div className="hero-side">
        <Ring value={st.bookRate} size={148} stroke={12} color="var(--green)">
          <strong><CountUp value={st.bookRate * 100} format={v => Math.round(v) + '%'} /></strong>
          <span>of missed calls became jobs</span>
        </Ring>
        <ul className="hero-facts">
          <li><Lightning size={16} weight="fill" /><span><b>{st.avgTextBack}s</b> average time to text back</span></li>
          <li><ChatCircle size={16} weight="fill" /><span><b>{pct(st.replyRate)}</b> of texted callers replied</span></li>
          <li><CalendarCheck size={16} weight="fill" /><span><b>{st.bookedByAi}</b> booked with no one lifting the phone</span></li>
        </ul>
      </div>
    </section>
  );
}

function Kpi({ icon: Icon, tone, label, value, format, deltaValue, invert, points, spark, sub }) {
  const color = { red: 'var(--red)', blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)' }[tone];
  return (
    <div className={'kpi kpi-' + tone}>
      <div className="kpi-top">
        <span className="kpi-icon"><Icon size={17} weight="fill" /></span>
        <span className="kpi-label">{label}</span>
        <Delta value={deltaValue} invert={invert} points={points} />
      </div>
      <strong className="kpi-value"><CountUp value={value} format={format} /></strong>
      <div className="kpi-foot">
        <span>{sub}</span>
      </div>
      <Sparkline data={spark} color={color} height={42} />
    </div>
  );
}

function ChartCard({ series }) {
  const { data } = useDesk();
  const [mode, setMode] = useState('calls');
  return (
    <Card
      className="chart-card"
      title={mode === 'calls' ? 'Missed calls and jobs won' : 'Revenue won back'}
      sub={mode === 'calls' ? 'Each bar is a day. The green part became a booked job.' : 'Value of jobs booked from missed calls, by the day the call came in'}
      action={<Segmented size="sm" label="Chart" value={mode} onChange={setMode} options={[{ value: 'calls', label: 'Calls' }, { value: 'revenue', label: 'Revenue' }]} />}
    >
      <DailyChart series={series} mode={mode} currency={data.settings.currency} />
      <div className="chart-legend">
        {mode === 'calls' ? (
          <>
            <span><i className="sw sw-missed" /> Missed, not booked</span>
            <span><i className="sw sw-booked" /> Turned into a job</span>
          </>
        ) : (
          <span><i className="sw sw-rev" /> Won back per day</span>
        )}
      </div>
    </Card>
  );
}

const FEED = {
  missed: { icon: PhoneX, tone: 'red' },
  text: { icon: ChatText, tone: 'blue' },
  reply: { icon: ChatCircle, tone: 'violet' },
  booked: { icon: CalendarCheck, tone: 'green' },
  alert: { icon: Siren, tone: 'amber' }
};

function ActivityFeed() {
  const { data, now } = useDesk();
  const items = useMemo(() => activity(data, now, 9), [data, now]);
  return (
    <Card title="Live activity" sub="Updates the moment something happens" action={<span className="live-chip"><span className="live-dot" /> Live</span>} className="feed-card">
      <ul className="feed">
        <AnimatePresence initial={false}>
          {items.map(e => {
            const f = FEED[e.kind];
            const Icon = f.icon;
            return (
              <motion.li key={e.id} layout initial={{ opacity: 0, x: -12, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <Link to={e.leadId ? '/inbox/' + e.leadId : '/inbox'} className="feed-item">
                  <span className={'feed-icon t-' + f.tone}><Icon size={14} weight="fill" /></span>
                  <span className="feed-text">
                    <strong>{e.title}</strong>
                    <span>{e.lead ? displayName(e.lead) : ''}{e.detail ? ': ' + e.detail : ''}</span>
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

function NeedsYou() {
  const { data, act, busy, now } = useDesk();
  const list = data.leads.filter(needsYou);
  return (
    <Card title="Needs you" sub="Emergencies and people who asked for a call" action={list.length ? <span className="count-chip">{list.length}</span> : null}>
      {list.length === 0 ? (
        <Empty icon={Check} title="You're all caught up">The AI is handling every conversation.</Empty>
      ) : (
        <ul className="needs">
          <AnimatePresence initial={false}>
            {list.map(l => (
              <motion.li key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }} className={'need' + (l.urgent ? ' is-urgent' : '')}>
                <Avatar lead={l} size={38} />
                <div className="need-text">
                  <Link to={'/inbox/' + l.id}><strong>{displayName(l)}</strong></Link>
                  <span>{l.urgent ? <><Siren size={12} weight="fill" /> {l.issue || 'Emergency'}</> : <><PhoneCall size={12} weight="fill" /> Asked for a call back</>}</span>
                  <em>{ago(l.alertedAt || l.lastAt, now)}</em>
                </div>
                <div className="need-actions">
                  <a className="btn btn-sm btn-soft" href={'tel:' + l.phone} aria-label={'Call ' + phone(l.phone)}><Phone size={13} weight="fill" /> Call</a>
                  <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act('ack', { lead: l.id }, 'Marked as handled')}>Done</button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}

const TILE = { booked: 'booked', chatting: 'live', texted: 'live', urgent: 'urgent', no_reply: 'quiet', lost: 'lost', opted_out: 'quiet' };

function CallBoard() {
  const { data, now } = useDesk();
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const today = new Date(now);
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
  const byDay = days.map(d => {
    const key = d.toDateString();
    return data.leads.filter(l => l.source === 'call' && new Date(l.createdAt).toDateString() === key).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });
  const max = Math.max(6, ...byDay.map(x => x.length));
  const legend = [['booked', 'Booked'], ['urgent', 'Emergency booked'], ['live', 'Still talking'], ['quiet', 'No reply'], ['lost', 'Lost']];
  return (
    <Card title="Every missed call, last 30 days" sub="One square per call nobody answered. Click one to open the conversation." action={
      <div className="board-hover">
        {hover ? (
          <>
            <Avatar lead={hover} size={24} />
            <span><b>{displayName(hover)}</b> {hover.issue ? hover.issue.toLowerCase() : 'no details yet'}</span>
            <StatusPill status={hover.status} urgent={hover.urgent} size="sm" />
          </>
        ) : <span className="muted">Hover a square</span>}
      </div>
    }>
      <div className="board-grid" style={{ '--rows': max }} onMouseLeave={() => setHover(null)}>
        {byDay.map((list, i) => {
          const d = days[i];
          const mark = i === 29 ? 'Today' : d.getDay() === 1 && i < 26 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          return (
            <div key={i} className={'board-col' + (d.getDay() === 0 ? ' is-sun' : '')}>
              <div className="board-stack">
                {list.map((l, j) => {
                  const tone = l.urgent && l.status === 'booked' ? 'urgent' : TILE[l.status] || 'quiet';
                  return (
                    <motion.button
                      key={l.id}
                      type="button"
                      className={'tile tile-' + tone}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.015 + j * 0.03, duration: 0.3 }}
                      onMouseEnter={() => setHover(l)}
                      onFocus={() => setHover(l)}
                      aria-label={displayName(l) + ', ' + (STATUS[l.status] ? STATUS[l.status].label : l.status)}
                      onClick={() => navigate('/inbox/' + l.id)}
                    />
                  );
                })}
              </div>
              <span className="board-day">{mark}</span>
            </div>
          );
        })}
      </div>
      <ul className="legend">
        {legend.map(([k, label]) => <li key={k}><span className={'tile tile-' + k} aria-hidden="true" />{label}</li>)}
      </ul>
    </Card>
  );
}
