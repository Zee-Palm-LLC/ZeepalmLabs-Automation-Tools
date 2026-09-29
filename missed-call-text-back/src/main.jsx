import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DeskProvider } from './state/DeskProvider.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DeskProvider>
        <App />
      </DeskProvider>
    </BrowserRouter>
  </StrictMode>
);
