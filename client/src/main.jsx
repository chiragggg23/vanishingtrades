import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initI18n } from './i18n/index.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/grid.css';

try {
  if (localStorage.getItem('vt-theme') === 'lamp')
    document.documentElement.setAttribute('data-theme', 'lamp');
} catch {
  /* ignore */
}

// The remembered language is loaded before the first render, so nothing flashes in English.
initI18n().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
