import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GymProvider } from './state/GymProvider.jsx';
import App from './App.jsx';
import './styles.css';
import './extra.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GymProvider>
        <App />
      </GymProvider>
    </BrowserRouter>
  </StrictMode>
);
