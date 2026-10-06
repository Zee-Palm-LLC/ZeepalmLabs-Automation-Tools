import { useLocation, useRoutes } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react';
import { useDesk } from './state/DeskProvider.jsx';
import { useUi } from './state/UiProvider.jsx';
import { Sidebar, Topbar, CommandPalette } from './components/Shell.jsx';
import { StageOverlay } from './components/LiveStage.jsx';
import { Toasts, Skeleton } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Live from './pages/Live.jsx';
import Inbox from './pages/Inbox.jsx';
import Schedule from './pages/Schedule.jsx';
import Calls from './pages/Calls.jsx';
import Waitlist from './pages/Waitlist.jsx';
import Settings from './pages/Settings.jsx';

const ROUTES = [
  { path: '/', element: <Dashboard /> },
  { path: '/live', element: <Live /> },
  { path: '/inbox', element: <Inbox /> },
  { path: '/inbox/:id', element: <Inbox /> },
  { path: '/schedule', element: <Schedule /> },
  { path: '/calls', element: <Calls /> },
  { path: '/waitlist', element: <Waitlist /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <Dashboard /> }
];

export default function App() {
  const location = useLocation();
  const { status, error, load } = useDesk();
  const { collapsed } = useUi();
  const page = useRoutes(ROUTES, location);
  const base = location.pathname.split('/')[1] || 'dashboard';

  return (
    <MotionConfig reducedMotion="user">
      <div className={'app' + (collapsed ? ' is-collapsed' : '')}>
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className={'content content-' + base}>
            {status === 'loading' && <Loading />}
            {status === 'error' && (
              <div className="fullstate">
                <span className="fullstate-icon"><WifiSlash size={30} weight="duotone" /></span>
                <h2>Can't reach your n8n workspace</h2>
                <p>{error}. Check that the Dashboard API workflow is published and VITE_API_BASE points at your workspace.</p>
                <button type="button" className="btn btn-primary" onClick={load}><ArrowsClockwise size={17} weight="bold" /> Try again</button>
              </div>
            )}
            {status === 'ready' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={base}
                  className="page"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {page}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
      {status === 'ready' && <CommandPalette />}
      <StageOverlay />
      <Toasts />
    </MotionConfig>
  );
}

function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <Skeleton h={210} r={22} />
      <div className="kpis" style={{ marginTop: 20 }}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} h={150} r={18} />)}
      </div>
      <div className="dash-row two-one" style={{ marginTop: 20 }}>
        <Skeleton h={340} r={18} />
        <Skeleton h={340} r={18} />
      </div>
    </div>
  );
}
