import { screen } from '@testing-library/react';
import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';
import { renderApp, signInAs } from './utils.jsx';

const routes = [
  ['/login', <p key="l">login page</p>],
  ['/dashboard/learner', <p key="d">learner home</p>],
  ['/admin', <p key="a">admin home</p>],
  [
    '/secret',
    <ProtectedRoute key="s" allowedRoles={['admin']}>
      <p>admin only</p>
    </ProtectedRoute>,
  ],
];

describe('ProtectedRoute', () => {
  it('sends signed-out visitors to /login with the return path', async () => {
    await renderApp({ route: '/secret?tab=x', routes });
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/login?next=${encodeURIComponent('/secret?tab=x')}`,
    );
  });

  it('shows a loading scene while the session is being checked', async () => {
    await signInAs('admin');
    await renderApp({ route: '/secret', routes });
    expect(screen.getByText('Winding the thread…')).toBeInTheDocument();
    expect(await screen.findByText('admin only')).toBeInTheDocument();
  });

  it('sends a signed-in user with the wrong role to their own dashboard', async () => {
    await signInAs('learner');
    await renderApp({ route: '/secret', routes });
    expect(await screen.findByText('learner home')).toBeInTheDocument();
    expect(screen.queryByText('admin only')).not.toBeInTheDocument();
  });

  it('lets the right role through', async () => {
    await signInAs('admin');
    await renderApp({ route: '/secret', routes });
    expect(await screen.findByText('admin only')).toBeInTheDocument();
  });
});
