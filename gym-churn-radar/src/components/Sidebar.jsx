import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Gauge, Crosshair, Users, EnvelopeSimple, DoorOpen, GearSix } from '@phosphor-icons/react';
import { useGym } from '../state/GymProvider.jsx';
import { PUBLIC_DEMO } from '../lib/api.js';

export const NAV = [
  { to: '/', label: 'Overview', icon: Gauge },
  { to: '/radar', label: 'Radar', icon: Crosshair },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/win-backs', label: 'Win-backs', icon: EnvelopeSimple },
  { to: '/check-ins', label: 'Check-ins', icon: DoorOpen },
  { to: '/settings', label: 'Settings', icon: GearSix }
];

export default function Sidebar() {
  const { data } = useGym();
  const { pathname } = useLocation();
  const risky = data ? data.stats.highRisk : 0;

  return (
    <nav className="sidebar" aria-label="Main">
      <div className="side-brand">
        <span className="brand-plate" aria-hidden="true" />
        <div>
          <p className="side-product">Churn Radar</p>
          <p className="side-gym">{data ? data.gym.name : 'Loading gym'}</p>
        </div>
      </div>
      <ul className="side-nav">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={'side-link' + (active ? ' is-active' : '')}>
                {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon size={21} weight={active ? 'fill' : 'regular'} className="side-icon" />
                <span className="side-label">{item.label}</span>
                {item.to === '/radar' && risky > 0 && <span className="side-badge">{risky}</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
      <div className="side-foot">
        <span className={'live-dot' + (data ? ' is-live' : '')} />
        <span>{PUBLIC_DEMO ? 'Live demo, runs in your browser' : data ? 'Connected to n8n' : 'Connecting to n8n'}</span>
      </div>
    </nav>
  );
}
