import { useLocation, useRoutes } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react';
import { useCare } from './state/CareProvider.jsx';
import { Sidebar, Topbar } from './components/Shell.jsx';
import { Toasts, Skeleton } from './components/ui.jsx';
import Today from './pages/Today.jsx';
import PillboxPage from './pages/PillboxPage.jsx';
import Medicines from './pages/Medicines.jsx';
import Health from './pages/Health.jsx';
import Circle from './pages/Circle.jsx';
import Messages from './pages/Messages.jsx';
import Live from './pages/Live.jsx';
import Settings from './pages/Settings.jsx';

const ROUTES = [
  { path: '/', element: <Today /> },
  { path: '/pillbox', element: <PillboxPage /> },
  { path: '/medicines', element: <Medicines /> },
  { path: '/health', element: <Health /> },
  { path: '/circle', element: <Circle /> },
  { path: '/messages', element: <Messages /> },
  { path: '/messages/:id', element: <Messages /> },
  { path: '/live', element: <Live /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <Today /> }
];

export default function App() {
  const location = useLocation();
  const { status, error, load } = useCare();
  const page = useRoutes(ROUTES, location);
  const base = location.pathname.split('/')[1] || 'today';

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className={'content content-' + base}>
            {status === 'loading' && <Loading />}
            {status === 'error' && (
              <div className="fullstate">
                <span className="fullstate-icon"><WifiSlash size={30} weight="duotone" /></span>
                <h2>Can’t reach your n8n workspace</h2>
                <p>{error}. Check that the Dashboard API workflow is published and VITE_API_BASE points at your workspace.</p>
                <button type="button" className="btn btn-primary" onClick={load}><ArrowsClockwise size={17} weight="bold" /> Try again</button>
              </div>
            )}
            {status === 'ready' && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={base} className="page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                  {page}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
      <Toasts />
    </MotionConfig>
  );
}

function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <Skeleton h={90} r={20} />
      <div className="today-grid" style={{ marginTop: 20 }}>
        <Skeleton h={420} r={22} />
        <Skeleton h={420} r={22} />
      </div>
    </div>
  );
}
