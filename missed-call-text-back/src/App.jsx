import { useLocation, useRoutes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react';
import { useDesk } from './state/DeskProvider.jsx';
import TopBar from './components/TopBar.jsx';
import { Toasts } from './components/bits.jsx';
import Live from './pages/Live.jsx';
import Inbox from './pages/Inbox.jsx';
import Calls from './pages/Calls.jsx';
import Jobs from './pages/Jobs.jsx';
import Settings from './pages/Settings.jsx';

const ROUTES = [
  { path: '/', element: <Live /> },
  { path: '/inbox', element: <Inbox />, title: 'Inbox', sub: 'Every conversation that started with a missed call. Jump in any time.' },
  { path: '/inbox/:id', element: <Inbox />, title: 'Inbox', sub: 'Every conversation that started with a missed call. Jump in any time.' },
  { path: '/calls', element: <Calls />, title: 'Calls', sub: 'Every call to the business line in the last 30 days, and when they go unanswered.' },
  { path: '/jobs', element: <Jobs />, title: 'Jobs', sub: 'Work that came in through a missed call and ended up in the calendar.' },
  { path: '/settings', element: <Settings />, title: 'Settings', sub: 'Your business, your hours and what the AI is allowed to say.' }
];

export default function App() {
  const location = useLocation();
  const { status, error, load } = useDesk();
  const page = useRoutes(ROUTES.map(r => ({ path: r.path, element: r.element })), location);
  const base = '/' + location.pathname.split('/')[1];
  const route = ROUTES.find(r => r.path === base) || ROUTES[0];

  return (
    <MotionConfig reducedMotion="user">
      <TopBar />
      <main className={'page' + (base === '/' ? ' page-live' : '') + (base === '/inbox' ? ' page-inbox' : '')}>
        {status === 'loading' && <div className="fullstate" aria-busy="true"><span className="spinner" aria-hidden="true" /><p className="muted">Loading the phone line</p></div>}
        {status === 'error' && (
          <div className="fullstate">
            <WifiSlash size={40} />
            <h2>Can't reach your n8n workspace</h2>
            <p>{error}. Check that the Dashboard API workflow is published and VITE_API_BASE points at your workspace.</p>
            <button type="button" className="btn btn-primary" onClick={load}><ArrowsClockwise size={18} weight="bold" /> Try again</button>
          </div>
        )}
        {status === 'ready' && (
          <>
            {route.title && (
              <div className="page-head">
                <h1>{route.title}</h1>
                <p>{route.sub}</p>
              </div>
            )}
            {page}
          </>
        )}
      </main>
      <Toasts />
    </MotionConfig>
  );
}
