import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CareProvider } from './state/CareProvider.jsx';
import { UiProvider } from './state/UiProvider.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UiProvider>
        <CareProvider>
          <App />
        </CareProvider>
      </UiProvider>
    </BrowserRouter>
  </StrictMode>
);
