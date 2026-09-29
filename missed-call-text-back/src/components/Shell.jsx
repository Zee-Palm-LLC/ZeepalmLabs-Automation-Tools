import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  SquaresFour, Broadcast, ChatsCircle, PhoneCall, CalendarCheck, GearSix, CaretDoubleLeft, MagnifyingGlass, Bell, Sun, Moon,
  List, X, Phone, Siren, CheckCircle, ArrowRight, Robot, ArrowCounterClockwise, SidebarSimple, CommandIcon
} from '@phosphor-icons/react';
import { useDesk } from '../state/DeskProvider.jsx';
import { useUi } from '../state/UiProvider.jsx';
import { Avatar, Kbd, StatusPill } from './ui.jsx';
import { phone, ago, displayName, needsYou } from '../lib/format.js';
import { activity } from '../lib/metrics.js';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: SquaresFour, end: true, group: 'Overview', title: 'Dashboard', sub: 'How missed calls turned into work over the last 30 days' },
  { to: '/live', label: 'Live demo', icon: Broadcast, group: 'Overview', title: 'Live demo', sub: 'Call the demo line, let it ring out and watch the AI rescue the call' },
  { to: '/inbox', label: 'Inbox', icon: ChatsCircle, group: 'Work', title: 'Inbox', sub: 'Every conversation that started with a missed call' },
  { to: '/calls', label: 'Calls', icon: PhoneCall, group: 'Work', title: 'Calls', sub: 'Every call to the business line and when they go unanswered' },
  { to: '/jobs', label: 'Jobs', icon: CalendarCheck, group: 'Work', title: 'Jobs', sub: 'Work that came in through a missed call' },
  { to: '/settings', label: 'Settings', icon: GearSix, group: 'Setup', title: 'Settings', sub: 'Your business, your hours and what the AI is allowed to say' }
];

export function Mark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="9" fill="#FFD02A" />
      <path d="M8 9.5A2.5 2.5 0 0 1 10.5 7h11A2.5 2.5 0 0 1 24 9.5v8a2.5 2.5 0 0 1-2.5 2.5H15l-4.6 4v-4A2.5 2.5 0 0 1 8 17.5z" fill="#0d1526" />
      <path d="M12.2 11.1c.3-.3.8-.3 1.1 0l1 1.1c.3.3.3.7.1 1l-.5.6c.5 1 1.3 1.8 2.3 2.3l.6-.5c.3-.3.7-.2 1 .1l1.1 1c.3.3.3.8 0 1.1l-.6.6c-.5.5-1.3.6-1.9.3a8.6 8.6 0 0 1-4.1-4.1c-.3-.6-.2-1.4.3-1.9z" fill="#FFD02A" />
    </svg>
  );
}

export function Sidebar() {
  const { data, act, busy, demo } = useDesk();
  const { collapsed, setCollapsed, navOpen, setNavOpen } = useUi();
  const location = useLocation();
  const needs = data ? data.stats.needsYou : 0;
  const open = data ? data.stats.open : 0;
  const s = data ? data.settings : null;
  const groups = ['Overview', 'Work', 'Setup'];

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, setNavOpen]);

  return (
    <>
      <AnimatePresence>
        {navOpen && <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNavOpen(false)} />}
      </AnimatePresence>
      <aside className={'sidebar' + (collapsed ? ' is-collapsed' : '') + (navOpen ? ' is-open' : '')} aria-label="Main navigation">
        <div className="sb-top">
          <NavLink to="/" className="sb-brand" aria-label="Missed Call Text-Back dashboard">
            <Mark />
            <span className="sb-brand-text">
              <strong>Text-Back</strong>
              <span>Missed call rescue</span>
            </span>
          </NavLink>
          <button type="button" className="icon-btn sb-close" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        {s && (
          <div className="sb-workspace">
            <Avatar label="BF" size={34} />
            <span className="sb-ws-text">
              <strong>{s.businessName}</strong>
              <span>{s.vans} vans, {s.areaLabel.split(',')[0]}</span>
            </span>
          </div>
        )}

        <nav className="sb-nav">
          {groups.map(g => (
            <div key={g} className="sb-group">
              <span className="sb-group-label">{g}</span>
              {NAV.filter(n => n.group === g).map(n => {
                const Icon = n.icon;
                const badge = n.to === '/inbox' ? needs || open || null : null;
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'sb-link' + (isActive ? ' on' : '')} title={collapsed ? n.label : undefined}>
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="sb-active" className="sb-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        <Icon size={19} weight={isActive ? 'fill' : 'regular'} className="sb-icon" />
                        <span className="sb-label">{n.label}</span>
                        {n.to === '/live' && <span className="sb-live" aria-hidden="true" />}
                        {badge ? <span className={'sb-badge' + (needs ? ' hot' : '')}>{badge}</span> : null}
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
              <span>{demo ? 'Demo line' : 'Business line'}</span>
            </div>
            <strong className="sb-line">{phone(s.businessPhone)}</strong>
            <button
              type="button"
              className={'sb-ai' + (s.aiEnabled ? ' on' : '')}
              disabled={busy}
              onClick={() => act('settings', { aiEnabled: !s.aiEnabled }, s.aiEnabled ? 'AI replies paused. New texts go to ' + s.ownerName : 'AI replies are back on')}
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
  const { data } = useDesk();
  const { theme, toggleTheme, setPaletteOpen, setStageOpen, setNavOpen, bellOpen, setBellOpen } = useUi();
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const route = NAV.find(n => n.to === base) || NAV[0];
  const needs = data ? data.stats.needsYou : 0;
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
          <span>Search or jump to</span>
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
          <Phone size={16} weight="fill" />
          <span>Call demo line</span>
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
  const needs = data.leads.filter(needsYou);
  const recent = useMemo(() => activity(data, now, 30).filter(e => e.kind === 'booked').slice(0, 4), [data, now]);

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
    for (const l of needs) await act('ack', { lead: l.id });
  };

  return (
    <motion.div ref={ref} className="popover notif-pop" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}>
      <div className="pop-head">
        <strong>Notifications</strong>
        {needs.length > 0 && <button type="button" className="link-btn" onClick={ackAll}>Mark all handled</button>}
      </div>
      <div className="pop-body">
        <span className="pop-label">Needs you</span>
        {needs.length === 0 && <p className="pop-empty"><CheckCircle size={16} weight="fill" /> Nothing needs you. The AI has it covered.</p>}
        {needs.map(l => (
          <button key={l.id} type="button" className="pop-item" onClick={() => go(l.id)}>
            <span className={'pop-icon ' + (l.urgent ? 'urgent' : 'call')}>{l.urgent ? <Siren size={15} weight="fill" /> : <PhoneCall size={15} weight="fill" />}</span>
            <span className="pop-text">
              <strong>{displayName(l)}</strong>
              <span>{l.urgent ? (l.issue || 'Emergency') : 'Asked for a call back'}</span>
            </span>
            <em>{ago(l.alertedAt || l.lastAt, now)}</em>
          </button>
        ))}
        <span className="pop-label">Recently booked</span>
        {recent.map(e => (
          <button key={e.id} type="button" className="pop-item" onClick={() => go(e.leadId)}>
            <span className="pop-icon booked"><CalendarCheck size={15} weight="fill" /></span>
            <span className="pop-text">
              <strong>{e.lead ? displayName(e.lead) : 'Customer'}</strong>
              <span>{e.detail || e.title}</span>
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
    const rank = list => list.map((it, i) => ({ it, i, sc: score(it) })).sort((x, y) => y.sc - x.sc || x.i - y.i).map(x => x.it);
    const pages = NAV.filter(n => match(n.label + ' ' + n.sub)).map(n => ({ id: 'p' + n.to, group: 'Go to', label: n.label, hint: n.sub, icon: n.icon, run: () => navigate(n.to) }));
    const actions = [
      { id: 'a-call', label: 'Call the demo line', hint: 'Let it ring out and watch the text-back', icon: Phone, run: () => setStageOpen(true) },
      { id: 'a-theme', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', hint: 'Change the look of the dashboard', icon: theme === 'dark' ? Sun : Moon, run: toggleTheme },
      { id: 'a-side', label: collapsed ? 'Expand the sidebar' : 'Collapse the sidebar', hint: 'More room for the page', icon: SidebarSimple, run: () => setCollapsed(c => !c) },
      { id: 'a-ai', label: data.settings.aiEnabled ? 'Pause AI replies' : 'Turn AI replies back on', hint: data.settings.aiEnabled ? 'New texts go to the owner instead' : 'The AI answers customers again', icon: Robot, run: () => act('settings', { aiEnabled: !data.settings.aiEnabled }, data.settings.aiEnabled ? 'AI replies paused' : 'AI replies are back on') },
      { id: 'a-reset', label: 'Reset demo data', hint: 'Rebuild 30 days of the sample business', icon: ArrowCounterClockwise, run: () => act('reset', {}, 'Demo data rebuilt') }
    ].filter(a => match(a.label + ' ' + a.hint)).map(a => ({ ...a, group: 'Actions' }));
    const leads = data.leads
      .filter(l => !needle || [l.name, l.phone, phone(l.phone), l.issue, l.zip].some(v => v && String(v).toLowerCase().includes(needle)))
      .slice(0, needle ? 8 : 5)
      .map(l => ({ id: 'l' + l.id, group: needle ? 'Conversations' : 'Recent conversations', label: displayName(l), hint: l.issue || 'No details yet', lead: l, run: () => navigate('/inbox/' + l.id) }));
    const groups = [rank(pages), rank(actions), leads].filter(g => g.length).sort((x, y) => score(y[0]) - score(x[0]));
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
              <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search pages, actions, customers, phone numbers or ZIP codes" aria-label="Search" />
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
                      {it.lead ? <Avatar lead={it.lead} size={26} /> : <span className="palette-icon"><Icon size={16} /></span>}
                      <span className="palette-text">
                        <strong>{it.label}</strong>
                        <span>{it.hint}</span>
                      </span>
                      {it.lead && <StatusPill status={it.lead.status} urgent={it.lead.urgent} size="sm" />}
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
