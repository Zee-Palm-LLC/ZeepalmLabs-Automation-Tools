import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  SquaresFour, Broadcast, ChatsCircle, CalendarDots, PhoneCall, ListChecks, GearSix, CaretDoubleLeft, MagnifyingGlass, Bell, Sun, Moon,
  List, X, FirstAidKit, CheckCircle, ArrowRight, Robot, ArrowCounterClockwise, SidebarSimple, CommandIcon, Play, ArrowsClockwise
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Avatar, Kbd } from './ui.jsx';
import { phone, ago, displayName, FLAG, until } from '../lib/format.js';
import { activity, callList } from '../lib/metrics.js';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: SquaresFour, end: true, group: 'Overview', title: 'Dashboard', sub: 'How many visits the reminders and the waitlist saved this month' },
  { to: '/live', label: 'Live demo', icon: Broadcast, group: 'Overview', title: 'Live demo', sub: 'Be the patient. Reply to a reminder and watch the clinic side react' },
  { to: '/schedule', label: 'Schedule', icon: CalendarDots, group: 'Front desk', title: 'Schedule', sub: 'Every chair, every day, with who has confirmed and who might not come' },
  { to: '/inbox', label: 'Inbox', icon: ChatsCircle, group: 'Front desk', title: 'Inbox', sub: 'Every text conversation with a patient' },
  { to: '/calls', label: 'Call list', icon: PhoneCall, group: 'Front desk', title: 'Call list', sub: 'Patients most likely to miss their visit, so a person can call them first' },
  { to: '/waitlist', label: 'Waitlist', icon: ListChecks, group: 'Front desk', title: 'Waitlist', sub: 'People who want an earlier visit, and the open times offered to them' },
  { to: '/settings', label: 'Settings', icon: GearSix, group: 'Setup', title: 'Settings', sub: 'Your clinic, your reminder timing and what the AI is allowed to say' }
];

export function Mark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path d="M16 6.2 24.2 9v6.3c0 5-3.4 8.9-8.2 10.5C11.2 24.2 7.8 20.3 7.8 15.3V9z" fill="var(--brand-ink)" />
      <path d="m12.3 15.8 2.6 2.6 5-5.2" fill="none" stroke="var(--brand)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function nextRun(now) {
  const step = 15 * 60000;
  return Math.ceil((now + 1000) / step) * step;
}

export function Sidebar() {
  const { data, stats, act, busy, demo, now } = useDesk();
  const { collapsed, setCollapsed, navOpen, setNavOpen } = useUi();
  const location = useLocation();
  const s = data ? data.settings : null;
  const groups = ['Overview', 'Front desk', 'Setup'];
  const calls = useMemo(() => (data ? callList(data, now).length : 0), [data, Math.floor(now / 60000)]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, setNavOpen]);

  const badge = to => {
    if (!stats) return null;
    if (to === '/inbox') return stats.needsYou ? { n: stats.needsYou, hot: true } : stats.unread ? { n: stats.unread } : null;
    if (to === '/calls') return calls ? { n: calls } : null;
    if (to === '/waitlist') return stats.liveOffers ? { n: stats.liveOffers, live: true } : null;
    return null;
  };

  return (
    <>
      <AnimatePresence>
        {navOpen && <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNavOpen(false)} />}
      </AnimatePresence>
      <aside className={'sidebar' + (collapsed ? ' is-collapsed' : '') + (navOpen ? ' is-open' : '')} aria-label="Main navigation">
        <div className="sb-top">
          <NavLink to="/" className="sb-brand" aria-label="No-Show Shield dashboard">
            <Mark />
            <span className="sb-brand-text">
              <strong>No-Show Shield</strong>
              <span>Reminders and waitlist</span>
            </span>
          </NavLink>
          <button type="button" className="icon-btn sb-close" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        {s && (
          <div className="sb-workspace">
            <Avatar label="WC" size={34} />
            <span className="sb-ws-text">
              <strong>{s.clinicName}</strong>
              <span>{s.providers.length} chairs, Austin</span>
            </span>
          </div>
        )}

        <nav className="sb-nav">
          {groups.map(g => (
            <div key={g} className="sb-group">
              <span className="sb-group-label">{g}</span>
              {NAV.filter(n => n.group === g).map(n => {
                const Icon = n.icon;
                const b = badge(n.to);
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'sb-link' + (isActive ? ' on' : '')} title={collapsed ? n.label : undefined}>
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="sb-active" className="sb-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        <Icon size={19} weight={isActive ? 'fill' : 'regular'} className="sb-icon" />
                        <span className="sb-label">{n.label}</span>
                        {n.to === '/live' && <span className="sb-live" aria-hidden="true" />}
                        {b ? <span className={'sb-badge' + (b.hot ? ' hot' : '') + (b.live ? ' live' : '')}>{b.n}</span> : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {s && (
          <div className="sb-status">
            <div className="sb-status-head">
              <span className="live-dot" aria-hidden="true" />
              <span>{demo ? 'Demo clinic' : 'Reminder engine'}</span>
            </div>
            <strong className="sb-line">Next check in {until(new Date(nextRun(now)).toISOString(), now)}</strong>
            <button
              type="button"
              className={'sb-ai' + (s.aiEnabled ? ' on' : '')}
              disabled={busy}
              onClick={() => act('settings', { aiEnabled: !s.aiEnabled }, s.aiEnabled ? 'AI replies paused. New texts wait for the front desk' : 'AI replies are back on')}
            >
              <Robot size={15} weight="fill" />
              <span>AI replies {s.aiEnabled ? 'on' : 'off'}</span>
              <i aria-hidden="true" />
            </button>
          </div>
        )}

        <button type="button" className="sb-collapse" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <CaretDoubleLeft size={16} weight="bold" />
          <span>Collapse</span>
        </button>
      </aside>
    </>
  );
}

export function Topbar() {
  const { stats } = useDesk();
  const { theme, toggleTheme, setPaletteOpen, setStageOpen, setNavOpen, bellOpen, setBellOpen } = useUi();
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const route = NAV.find(n => n.to === base) || NAV[0];
  const needs = stats ? stats.needsYou : 0;
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

  return (
    <header className="topbar">
      <button type="button" className="icon-btn tb-menu" onClick={() => setNavOpen(true)} aria-label="Open menu"><List size={20} /></button>
      <div className="tb-title">
        <h1>{route.title}</h1>
        <p>{route.sub}</p>
      </div>
      <div className="tb-actions">
        <button type="button" className="tb-search" onClick={() => setPaletteOpen(true)}>
          <MagnifyingGlass size={16} weight="bold" />
          <span>Search patients or jump to</span>
          <span className="tb-keys"><Kbd>{mac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
        </button>
        <button type="button" className="icon-btn tb-search-sm" onClick={() => setPaletteOpen(true)} aria-label="Search"><MagnifyingGlass size={18} /></button>
        <div className="bell-wrap">
          <button type="button" className={'icon-btn' + (bellOpen ? ' on' : '')} onClick={() => setBellOpen(o => !o)} aria-label={'Notifications' + (needs ? ', ' + needs + ' need you' : '')} aria-expanded={bellOpen}>
            <Bell size={19} weight={needs ? 'fill' : 'regular'} />
            {needs > 0 && <span className="bell-badge">{needs}</span>}
          </button>
          <AnimatePresence>{bellOpen && <Notifications />}</AnimatePresence>
        </div>
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} style={{ display: 'grid' }}>
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </motion.span>
          </AnimatePresence>
        </button>
        <button type="button" className="btn btn-primary tb-call" onClick={() => setStageOpen(true)}>
          <span className="call-ping" aria-hidden="true" />
          <Play size={15} weight="fill" />
          <span>Try it as a patient</span>
        </button>
      </div>
    </header>
  );
}

function Notifications() {
  const { data, act, now } = useDesk();
  const { setBellOpen } = useUi();
  const navigate = useNavigate();
  const ref = useRef(null);
  const needs = data.patients.filter(p => p.flag && !p.flag.ack).sort((a, b) => Date.parse(b.flag.at) - Date.parse(a.flag.at));
  const recent = useMemo(() => activity(data, now, 40).filter(e => e.kind === 'filled').slice(0, 4), [data, now]);

  useEffect(() => {
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.bell-wrap')) setBellOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [setBellOpen]);

  const go = id => {
    setBellOpen(false);
    navigate('/inbox/' + id);
  };

  const ackAll = async () => {
    for (const p of needs) await act('ack', { patient: p.id });
  };

  return (
    <motion.div ref={ref} className="popover notif-pop" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}>
      <div className="pop-head">
        <strong>Notifications</strong>
        {needs.length > 0 && <button type="button" className="link-btn" onClick={ackAll}>Mark all handled</button>}
      </div>
      <div className="pop-body">
        <span className="pop-label">Needs a person</span>
        {needs.length === 0 && <p className="pop-empty"><CheckCircle size={16} weight="fill" /> Nothing needs you. Every reply has been handled.</p>}
        {needs.map(p => (
          <button key={p.id} type="button" className="pop-item" onClick={() => go(p.id)}>
            <span className={'pop-icon ' + (p.flag.kind === 'clinical' ? 'urgent' : 'call')}>{p.flag.kind === 'clinical' ? <FirstAidKit size={15} weight="fill" /> : <PhoneCall size={15} weight="fill" />}</span>
            <span className="pop-text">
              <strong>{displayName(p)}</strong>
              <span>{FLAG[p.flag.kind] ? FLAG[p.flag.kind].label : 'Needs a reply'}</span>
            </span>
            <em>{ago(p.flag.at, now)}</em>
          </button>
        ))}
        <span className="pop-label">Refilled from the waitlist</span>
        {recent.map(e => (
          <button key={e.id} type="button" className="pop-item" onClick={() => go(e.patient.id)}>
            <span className="pop-icon booked"><ArrowsClockwise size={15} weight="bold" /></span>
            <span className="pop-text">
              <strong>{displayName(e.patient)}</strong>
              <span>{e.text.replace(/^Booked from the waitlist: /, 'Took ')}</span>
            </span>
            <em>{ago(e.at, now)}</em>
          </button>
        ))}
      </div>
      <button type="button" className="pop-foot" onClick={() => { setBellOpen(false); navigate('/inbox'); }}>
        Open the inbox <ArrowRight size={14} weight="bold" />
      </button>
    </motion.div>
  );
}

export function CommandPalette() {
  const { data, act, busy } = useDesk();
  const { paletteOpen, setPaletteOpen, theme, toggleTheme, setStageOpen, collapsed, setCollapsed } = useUi();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ('');
      setIndex(0);
      setTimeout(() => input.current && input.current.focus(), 30);
    }
  }, [paletteOpen]);

  const items = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const match = s => !needle || s.toLowerCase().includes(needle);
    const score = it => (!needle ? 0 : it.label.toLowerCase().startsWith(needle) ? 3 : it.label.toLowerCase().includes(needle) ? 2 : 1);
    const rank = arr => arr.map((it, i) => ({ it, i, sc: score(it) })).sort((x, y) => y.sc - x.sc || x.i - y.i).map(x => x.it);
    const pages = NAV.filter(n => match(n.label + ' ' + n.sub)).map(n => ({ id: 'p' + n.to, group: 'Go to', label: n.label, hint: n.sub, icon: n.icon, run: () => navigate(n.to) }));
    const actions = [
      { id: 'a-demo', label: 'Try it as a patient', hint: 'Get a reminder on a demo phone and reply to it', icon: Play, run: () => setStageOpen(true) },
      { id: 'a-theme', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', hint: 'Change the look of the dashboard', icon: theme === 'dark' ? Sun : Moon, run: toggleTheme },
      { id: 'a-side', label: collapsed ? 'Expand the sidebar' : 'Collapse the sidebar', hint: 'More room for the page', icon: SidebarSimple, run: () => setCollapsed(c => !c) },
      { id: 'a-ai', label: data.settings.aiEnabled ? 'Pause AI replies' : 'Turn AI replies back on', hint: data.settings.aiEnabled ? 'Replies wait for the front desk instead' : 'The AI answers patients again', icon: Robot, run: () => act('settings', { aiEnabled: !data.settings.aiEnabled }, data.settings.aiEnabled ? 'AI replies paused' : 'AI replies are back on') },
      { id: 'a-reset', label: 'Reset demo data', hint: 'Rebuild 30 days of the sample clinic', icon: ArrowCounterClockwise, run: () => act('reset', {}, 'Demo data rebuilt') }
    ].filter(a => match(a.label + ' ' + a.hint)).map(a => ({ ...a, group: 'Actions' }));
    const people = needle
      ? data.patients
        .filter(p => [p.name, p.phone, phone(p.phone)].some(v => v && String(v).toLowerCase().includes(needle)))
        .slice(0, 8)
        .map(p => ({ id: 'l' + p.id, group: 'Patients', label: displayName(p), hint: phone(p.phone) + (p.visits ? ', ' + p.visits + ' visits' : ', new patient'), patient: p, run: () => navigate('/inbox/' + p.id) }))
      : [];
    const groups = [rank(pages), rank(actions), people].filter(g => g.length).sort((x, y) => score(y[0]) - score(x[0]));
    return groups.flat();
  }, [data, q, navigate, theme, toggleTheme, setStageOpen, collapsed, setCollapsed, act]);

  useEffect(() => {
    setIndex(0);
  }, [q]);

  useEffect(() => {
    const el = list.current && list.current.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = item => {
    if (!item || busy) return;
    setPaletteOpen(false);
    item.run();
  };

  const onKey = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(i => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(items[index]);
    } else if (e.key === 'Escape') {
      setPaletteOpen(false);
    }
  };

  let lastGroup = null;
  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="overlay palette-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && setPaletteOpen(false)}>
          <motion.div className="palette" role="dialog" aria-modal="true" aria-label="Command menu" initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
            <div className="palette-search">
              <MagnifyingGlass size={18} weight="bold" />
              <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search pages, actions, patient names or phone numbers" aria-label="Search" />
              <Kbd>Esc</Kbd>
            </div>
            <div className="palette-list" ref={list} role="listbox">
              {items.length === 0 && <p className="palette-empty">Nothing matches "{q}".</p>}
              {items.map((it, i) => {
                const head = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const Icon = it.icon;
                return (
                  <div key={it.id}>
                    {head && <span className="palette-group">{head}</span>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === index}
                      data-active={i === index}
                      className={'palette-item' + (i === index ? ' on' : '')}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => run(it)}
                    >
                      {it.patient ? <Avatar patient={it.patient} size={26} /> : <span className="palette-icon"><Icon size={16} /></span>}
                      <span className="palette-text">
                        <strong>{it.label}</strong>
                        <span>{it.hint}</span>
                      </span>
                      {i === index && <ArrowRight size={14} weight="bold" className="palette-go" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="palette-foot">
              <span><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
              <span><Kbd>Enter</Kbd> to open</span>
              <span className="palette-brand"><CommandIcon size={13} /> Command menu</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
