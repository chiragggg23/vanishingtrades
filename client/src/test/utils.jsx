import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { initI18n } from '../i18n/index.js';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { auth } from '../api/index.js';

export async function setupI18n() {
  await initI18n();
}

/** Shows the current location so tests can assert on URL state. */
export function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname + loc.search}</output>;
}

/** Sign in through the API layer (mock) before rendering. */
export async function signInAs(role) {
  return auth.login(`demo-${role}@vanishingtrades.test`, 'demo1234');
}

/**
 * Render with router, toasts and auth. `routes` is a list of [path, element];
 * the first route is used when `ui` is omitted.
 */
export async function renderApp({ ui, route = '/', routes } = {}) {
  await setupI18n();
  const content = routes ? (
    <Routes>
      {routes.map(([path, el]) => (
        <Route key={path} path={path} element={el} />
      ))}
    </Routes>
  ) : (
    ui
  );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          {content}
          <LocationProbe />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
