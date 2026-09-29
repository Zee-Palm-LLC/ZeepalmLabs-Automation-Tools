import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DeskProvider } from './state/DeskProvider.jsx';
import { UiProvider } from './state/UiProvider.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UiProvider>
        <DeskProvider>
          <App />
        </DeskProvider>
      </UiProvider>
    </BrowserRouter>
  </StrictMode>
);
