import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, TrendUp, TrendDown } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { money } from '../lib/format.js';
import CountUp from '../components/CountUp.jsx';
import Barbell from '../components/Barbell.jsx';
import MemberLine from '../components/MemberLine.jsx';
import TrendChart from '../components/TrendChart.jsx';
import LetterCard from '../components/LetterCard.jsx';
import RadarScope from '../components/RadarScope.jsx';

export default function Overview() {
  const { data, busy } = useGym();
  const { stats, gym } = data;
  const cur = gym.currency;
  const slipping = data.members.filter(m => m.status === 'active' && (m.level === 'high' || m.level === 'medium')).slice(0, 5);
  const delta = stats.visitsLastWeek ? Math.round(((stats.visitsThisWeek - stats.visitsLastWeek) / stats.visitsLastWeek) * 100) : null;

  return (
    <>
      <section className="hero">
        <div className="hero-main">
        <div className="hero-lead">
          <p className="hero-label">Won back in the last 30 days</p>
          <p className="hero-figure">
            <CountUp value={stats.monthlyRevenueWonBackLast30Days} format={v => money(v, cur)} duration={1.8} />
            <span className="hero-unit">/mo</span>
          </p>
          <p className="hero-caption">
            {stats.membersBackLast30Days
              ? stats.membersBackLast30Days + (stats.membersBackLast30Days === 1 ? ' member' : ' members') + ' walked back in after a win-back email. Worth ' + money(stats.monthlyRevenueWonBackLast30Days * 12, cur) + ' a year if they stay.'
              : 'Members who return after a win-back email show up here.'}
          </p>
        </div>
        <dl className="hero-stats">
          <Stat
            label="At risk right now"
            tone="red"
            figure={stats.scoredMembers ? <><CountUp value={stats.monthlyRevenueAtRisk} format={v => money(v, cur)} /><small>/mo</small></> : '–'}
            note={stats.scoredMembers ? stats.highRisk + ' high and ' + stats.mediumRisk + ' medium risk members' : 'Run a scan to score members'}
          />
          <Stat
            label="Win-back rate"
            figure={stats.winbackRatePercent == null ? '–' : <><CountUp value={stats.winbackRatePercent} /><small>%</small></>}
            note="of emailed members came back within 14 days"
          />
          <Stat
            label="Visits this week"
            figure={<CountUp value={stats.visitsThisWeek} />}
            noteClass={delta == null ? '' : delta >= 0 ? 'up' : 'down'}
            note={delta == null ? 'check-ins in the last 7 days' : <>{delta >= 0 ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />} {Math.abs(delta)}% {delta >= 0 ? 'more' : 'fewer'} than last week</>}
          />
        </dl>
        </div>
        <div className="hero-scope">
          <RadarScope scanning={busy === 'scan'} />
          <p className="scope-caption">Every blip is a member. The closer to the center, the closer they are to cancelling. Tap one to act.</p>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <div>
              <h2>Risk on the bar</h2>
              <p className="muted">How your {stats.activeMembers} active members are loaded</p>
            </div>
          </header>
          <Barbell stats={stats} />
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h2>Slipping away</h2>
              <p className="muted">Highest risk first. Tap a member to act.</p>
            </div>
            <Link to="/radar" className="text-link">Open radar <ArrowRight size={16} weight="bold" /></Link>
          </header>
          {slipping.length ? (
            <ul className="member-list">
              {slipping.map((m, i) => <MemberLine key={m.ref} member={m} index={i} compact />)}
            </ul>
          ) : (
            <p className="empty-note">{stats.scoredMembers ? 'Nobody is at risk right now.' : 'Run a scan to see who is slipping away.'}</p>
          )}
        </section>
      </div>

      <div className="grid-2 grid-2-wide">
        <section className="card">
          <header className="card-head">
            <div>
              <h2>Check-ins, last 30 days</h2>
              <p className="muted">Hover a day for the count</p>
            </div>
            <Link to="/check-ins" className="text-link">Check-ins <ArrowRight size={16} weight="bold" /></Link>
          </header>
          <TrendChart trend={data.trend} />
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h2>Latest win-backs</h2>
              <p className="muted">{stats.emailsLast7Days} sent this week</p>
            </div>
            <Link to="/win-backs" className="text-link">All <ArrowRight size={16} weight="bold" /></Link>
          </header>
          {data.outreach.length ? (
            <ul className="letters">
              {data.outreach.slice(0, 3).map((l, i) => <LetterCard key={l.ref + l.sentAt} letter={l} index={i} />)}
            </ul>
          ) : (
            <p className="empty-note">High-risk members get a personal email on the next scan.</p>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, tone, figure, note, noteClass = '' }) {
  return (
    <motion.div className={'hero-stat' + (tone ? ' tone-' + tone : '')} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
      <dt>{label}</dt>
      <dd>
        <span className="hero-num">{figure}</span>
        <span className={'hero-note ' + noteClass}>{note}</span>
      </dd>
    </motion.div>
  );
}
