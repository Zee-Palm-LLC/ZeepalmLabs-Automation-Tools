import { useLocation, useRoutes } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react';
import { useGym } from './state/GymProvider.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Toasts from './components/Toasts.jsx';
import MemberDrawer from './components/MemberDrawer.jsx';
import ScanBanner from './components/ScanBanner.jsx';
import Overview from './pages/Overview.jsx';
import Radar from './pages/Radar.jsx';
import Members from './pages/Members.jsx';
import WinBacks from './pages/WinBacks.jsx';
import CheckIns from './pages/CheckIns.jsx';
import Settings from './pages/Settings.jsx';

const ROUTES = [
  { path: '/', element: <Overview />, title: 'Overview', subtitle: 'Money kept, money at risk, and who needs you this week' },
  { path: '/radar', element: <Radar />, title: 'Radar', subtitle: 'Eight weeks of visits per member. Rows that go quiet are the ones about to cancel' },
  { path: '/members', element: <Members />, title: 'Members', subtitle: 'Everyone on your books, with their risk and their rhythm' },
  { path: '/win-backs', element: <WinBacks />, title: 'Win-backs', subtitle: 'Personal emails written by Claude, tracked until the member walks back in' },
  { path: '/check-ins', element: <CheckIns />, title: 'Check-ins', subtitle: 'Who came in, how busy the floor is, and how data gets here' },
  { path: '/settings', element: <Settings />, title: 'Settings', subtitle: 'Your gym, your win-back offer and the rules the radar uses' }
];

export default function App() {
  const location = useLocation();
  const { status, error, load } = useGym();
  const page = useRoutes(ROUTES.map(r => ({ path: r.path, element: r.element })), location);
  const route = ROUTES.find(r => (r.path === '/' ? location.pathname === '/' : location.pathname.startsWith(r.path))) || ROUTES[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <Sidebar />
        <div className="stage">
          <TopBar title={route.title} subtitle={route.subtitle} />
          <ScanBanner />
          {status === 'loading' && <Loader />}
          {status === 'error' && (
            <div className="fullstate">
              <WifiSlash size={40} />
              <h2>Can not reach your n8n workspace</h2>
              <p>{error}. Check that the Dashboard API workflow is published, then try again.</p>
              <button type="button" className="btn btn-primary" onClick={load}><ArrowsClockwise size={18} weight="bold" /> Try again</button>
            </div>
          )}
          {status === 'ready' && (
            <AnimatePresence mode="wait">
              <motion.main
                key={location.pathname}
                className="page"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                {page}
              </motion.main>
            </AnimatePresence>
          )}
        </div>
      </div>
      <MemberDrawer />
      <Toasts />
    </MotionConfig>
  );
}

function Loader() {
  return (
    <div className="fullstate" aria-busy="true">
      <div className="loader-bar" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className={'loader-plate lp-' + i}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <p className="muted">Loading your gym from n8n</p>
    </div>
  );
}
