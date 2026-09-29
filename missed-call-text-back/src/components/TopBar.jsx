import { NavLink } from 'react-router-dom';
import { useDesk } from '../state/DeskProvider.jsx';
import { phone } from '../lib/format.js';

const LINKS = [
  { to: '/', label: 'Live', end: true },
  { to: '/inbox', label: 'Inbox' },
  { to: '/calls', label: 'Calls' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/settings', label: 'Settings' }
];

export function Mark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#FFD02A" />
      <path d="M8 9.5A2.5 2.5 0 0 1 10.5 7h11A2.5 2.5 0 0 1 24 9.5v8a2.5 2.5 0 0 1-2.5 2.5H15l-4.6 4v-4h0A2.5 2.5 0 0 1 8 17.5z" fill="#13213A" />
      <path d="M12.2 11.1c.3-.3.8-.3 1.1 0l1 1.1c.3.3.3.7.1 1l-.5.6c.5 1 1.3 1.8 2.3 2.3l.6-.5c.3-.3.7-.2 1 .1l1.1 1c.3.3.3.8 0 1.1l-.6.6c-.5.5-1.3.6-1.9.3a8.6 8.6 0 0 1-4.1-4.1c-.3-.6-.2-1.4.3-1.9z" fill="#FFD02A" />
    </svg>
  );
}

export default function TopBar() {
  const { data, demo } = useDesk();
  const needs = data ? data.stats.needsYou : 0;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="brand" aria-label="Missed Call Text-Back, live view">
          <Mark />
          <span className="brand-text">
            <strong>Missed Call Text-Back</strong>
            {data && <span>{data.settings.businessName}</span>}
          </span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          {LINKS.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => 'nav-link' + (isActive ? ' on' : '')}>
              {l.label}
              {l.to === '/inbox' && needs > 0 && <span className="nav-badge" aria-label={needs + ' need you'}>{needs}</span>}
            </NavLink>
          ))}
        </nav>
        {data && (
          <div className="line-chip" title={demo ? 'Demo: calls and texts run in your browser' : 'Your Twilio number'}>
            <span className="live-dot" aria-hidden="true" />
            <span>{demo ? 'Demo line' : 'Line'} {phone(data.settings.businessPhone)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
