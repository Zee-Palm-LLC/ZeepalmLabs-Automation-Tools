import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlass, SignIn, Check, UploadSimple, Copy, Link as LinkIcon } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { initials, lastSeen, todayKey } from '../lib/format.js';
import { checkinWebhookUrl, uploadFormUrl, PUBLIC_DEMO } from '../lib/api.js';
import CountUp from '../components/CountUp.jsx';
import TrendChart from '../components/TrendChart.jsx';

export default function CheckIns() {
  const { data, checkIn, openMember, toast } = useGym();
  const [query, setQuery] = useState('');
  const today = todayKey();
  const active = data.members.filter(m => m.status === 'active');
  const inToday = active.filter(m => m.recentVisits.includes(today));
  const { stats } = data;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return active.filter(m => [m.name, m.email, m.ref].some(v => String(v || '').toLowerCase().includes(q))).slice(0, 6);
  }, [query, active]);

  const copy = async text => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard', 'success');
    } catch {
      toast('Copy failed. Select the text and copy it manually.', 'error');
    }
  };

  return (
    <>
      <section className="kpi-row">
        <Kpi label="In today" value={inToday.length} note={inToday.length === 1 ? 'member so far' : 'members so far'} />
        <Kpi label="This week" value={stats.visitsThisWeek} note="check-ins in the last 7 days" />
        <Kpi label="Week before" value={stats.visitsLastWeek} note="for comparison" />
      </section>

      <div className="grid-2 grid-2-wide">
        <section className="card">
          <header className="card-head">
            <div>
              <h2>Check-ins per day</h2>
              <p className="muted">The red bar is today. The dashed line is your daily average.</p>
            </div>
          </header>
          <TrendChart trend={data.trend} height={220} />
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h2>Check someone in</h2>
              <p className="muted">For members who forgot their card</p>
            </div>
          </header>
          <label className="search">
            <MagnifyingGlass size={18} weight="bold" />
            <input type="search" placeholder="Type a name or member ID" value={query} onChange={e => setQuery(e.target.value)} aria-label="Find a member to check in" />
          </label>
          <ul className="quick-list">
            <AnimatePresence initial={false}>
              {matches.map(m => {
                const done = m.recentVisits.includes(today);
                return (
                  <motion.li key={m.ref} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <span className="avatar" data-level={m.level}>{initials(m.name)}</span>
                    <span className="quick-who"><strong>{m.name}</strong><small>{lastSeen(m)}</small></span>
                    <motion.button type="button" whileTap={{ scale: 0.92 }} className={'chip-btn' + (done ? ' is-done' : '')} disabled={done} onClick={() => checkIn(m)}>
                      {done ? <Check size={16} weight="bold" /> : <SignIn size={16} weight="bold" />}
                      <span>{done ? 'In today' : 'Check in'}</span>
                    </motion.button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {query && !matches.length && <p className="empty-note">No active member matches “{query}”.</p>}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <div>
              <h2>In the gym today</h2>
              <p className="muted">{inToday.length ? 'Tap a member to see their profile' : 'Nobody has checked in yet today'}</p>
            </div>
          </header>
          <div className="face-wall">
            <AnimatePresence>
              {inToday.map((m, i) => (
                <motion.button
                  key={m.ref}
                  type="button"
                  className="face"
                  onClick={() => openMember(m.ref)}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20, delay: i * 0.03 }}
                  title={m.name}
                >
                  <span className="avatar" data-level={m.level}>{initials(m.name)}</span>
                  <span>{m.name.split(' ')[0]}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h2>Bring your data in</h2>
              <p className="muted">Works with any gym software</p>
            </div>
          </header>
          <div className="connect">
            <div className="connect-item">
              <UploadSimple size={24} weight="duotone" />
              <div>
                <strong>Upload a CSV export</strong>
                <p className="muted">Members list first, then check-in history. Columns are matched automatically.</p>
              </div>
              {PUBLIC_DEMO
                ? <button type="button" className="btn btn-primary btn-sm" onClick={() => toast('Uploads are switched off in the live demo. In your own setup this opens your n8n upload form.', 'neutral')}>Open upload form</button>
                : <a className="btn btn-primary btn-sm" href={uploadFormUrl} target="_blank" rel="noreferrer">Open upload form</a>}
            </div>
            <div className="connect-item">
              <LinkIcon size={24} weight="duotone" />
              <div>
                <strong>Connect a door scanner or booking app</strong>
                <p className="muted">POST <code>{'{ "member_id": "M-2001" }'}</code> to this address on every check-in.</p>
                <code className="url">{checkinWebhookUrl}</code>
              </div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => copy(checkinWebhookUrl)}><Copy size={16} weight="bold" /> Copy</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, note }) {
  return (
    <motion.div className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <p className="muted">{label}</p>
      <p className="kpi-value"><CountUp value={value} /></p>
      <p className="muted small">{note}</p>
    </motion.div>
  );
}
