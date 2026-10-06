import { useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { House, CalendarCheck, Pill, Heartbeat, UsersThree, ChatCircleDots, PlayCircle, GearSix, Bell, Moon, Sun, List, X, Siren, Package, Warning, ChatText, Phone as PhoneIcon, CheckCircle, Info } from '@phosphor-icons/react';
import { useCare } from '../state/CareProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Avatar } from './ui.jsx';
import { LIDS } from './Pillbox.jsx';
import { openAlerts, unreadCount, personOf } from '../lib/metrics.js';
import { fullDate, ago } from '../lib/format.js';

export const NAV = [
  { to: '/', label: 'Today', icon: House, end: true },
  { to: '/pillbox', label: 'Pillbox', icon: CalendarCheck },
  { to: '/medicines', label: 'Medicines', icon: Pill },
  { to: '/health', label: 'Health log', icon: Heartbeat },
  { to: '/circle', label: 'Family circle', icon: UsersThree },
  { to: '/messages', label: 'Messages', icon: ChatCircleDots, badge: 'unread' },
  { to: '/live', label: 'Live demo', icon: PlayCircle, live: true }
];

const TITLES = {
  '': 'Today',
  pillbox: 'Pillbox',
  medicines: 'Medicines',
  health: 'Health log',
  circle: 'Family circle',
  messages: 'Messages',
  live: 'Live demo',
  settings: 'Settings'
};

export function Mark({ size = 34 }) {
  const dots = LIDS.map((c, i) => {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    return <circle key={i} cx={20 + Math.cos(a) * 13} cy={20 + Math.sin(a) * 13} r="3.6" fill={c} />;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="mark">
      <rect width="40" height="40" rx="12" className="mark-bg" />
      {dots}
      <path d="m14.6 20.4 3.7 3.6 7.2-7.6" fill="none" className="mark-check" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar() {
  const { data } = useCare();
  const { navOpen, setNavOpen, theme, toggleTheme } = useUi();
  const location = useLocation();
  useEffect(() => setNavOpen(false), [location.pathname, setNavOpen]);
  const unread = data ? unreadCount(data) : 0;
  return (
    <>
      <AnimatePresence>{navOpen && <motion.div className="nav-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNavOpen(false)} />}</AnimatePresence>
      <aside className={'sidebar' + (navOpen ? ' is-open' : '')} aria-label="Main">
        <div className="brand">
          <Mark />
          <div>
            <strong>Dose Circle</strong>
            <span>Medicine check-ins by text</span>
          </div>
          <button type="button" className="icon-btn nav-close" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} weight="bold" /></button>
        </div>
        {data && (
          <div className="household">
            <div className="household-faces">
              {data.people.map(p => <Avatar key={p.id} who={p} size={30} ring />)}
            </div>
            <div>
              <strong>{data.settings.household}</strong>
              <span>{data.people.map(p => p.name.split(' ')[0]).join(' and ')}, {data.circle.length} in the circle</span>
            </div>
          </div>
        )}
        <nav className="nav">
          {NAV.map(n => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'nav-item' + (isActive ? ' is-active' : '') + (n.live ? ' is-live' : '')}>
                <Icon size={20} weight="duotone" />
                <span>{n.label}</span>
                {n.badge === 'unread' && unread > 0 && <em className="nav-badge">{unread}</em>}
                {n.live && <em className="nav-live">Try it</em>}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' is-active' : '')}>
            <GearSix size={20} weight="duotone" />
            <span>Settings</span>
          </NavLink>
          <button type="button" className="nav-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <p className="sidebar-note">A made-up family. Every name, number and reading is fictional.</p>
        </div>
      </aside>
    </>
  );
}

const ALERT_ICON = { emergency: Siren, double: Siren, missed: PhoneIcon, refill: Package, reading: Heartbeat, symptom: Warning, callback: PhoneIcon, question: ChatText, partial: Info };

export function AlertIcon({ kind, size = 18 }) {
  const Icon = ALERT_ICON[kind] || Info;
  return <Icon size={size} weight="fill" />;
}

function Bell_() {
  const { data, now } = useCare();
  const { bellOpen, setBellOpen } = useUi();
  const ref = useRef(null);
  const navigate = useNavigate();
  const list = data ? openAlerts(data) : [];
  const fresh = list.filter(a => !a.ackAt);
  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target)) setBellOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [bellOpen, setBellOpen]);
  return (
    <div className="bell" ref={ref}>
      <button type="button" className={'icon-btn' + (fresh.length ? ' has-dot' : '')} onClick={() => setBellOpen(!bellOpen)} aria-label={fresh.length + ' alerts need you'} aria-expanded={bellOpen}>
        <Bell size={20} weight={fresh.length ? 'fill' : 'regular'} />
        {fresh.length > 0 && <em>{fresh.length}</em>}
      </button>
      <AnimatePresence>
        {bellOpen && (
          <motion.div className="bell-pop" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            <header><strong>Needs the family</strong><span>{list.length ? list.length + ' open' : 'All clear'}</span></header>
            {list.length === 0 && <p className="bell-empty"><CheckCircle size={18} weight="fill" /> Nothing open right now.</p>}
            {list.slice(0, 6).map(a => (
              <button key={a.id} type="button" className={'bell-row lvl-' + a.level} onClick={() => { setBellOpen(false); navigate('/'); }}>
                <span className="bell-icon"><AlertIcon kind={a.kind} size={16} /></span>
                <span><b>{a.title}</b><em>{(personOf(data, a.personId) || {}).name ? ago(a.at, now) : ''}{a.ackAt ? ', someone is on it' : ''}</em></span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar() {
  const { now, data } = useCare();
  const { setNavOpen } = useUi();
  const location = useLocation();
  const base = location.pathname.split('/')[1] || '';
  return (
    <header className="topbar">
      <button type="button" className="icon-btn nav-open" onClick={() => setNavOpen(true)} aria-label="Open menu"><List size={20} weight="bold" /></button>
      <div className="topbar-title">
        <h1>{TITLES[base] || 'Today'}</h1>
        <span>{fullDate(now)}</span>
      </div>
      <div className="topbar-actions">
        {base !== 'live' && (
          <Link to="/live" className="btn btn-primary btn-sm topbar-try">
            <PlayCircle size={17} weight="fill" /> Be Mom for a minute
          </Link>
        )}
        <Bell_ />
      </div>
    </header>
  );
}
