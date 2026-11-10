import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../../context/AuthContext.jsx';
import { LoadingScene } from '../ui/Scenes.jsx';

/**
 * Guards a route.
 * - while the session is being checked: loading scene
 * - signed out: /login with the return path in state and ?next=
 * - wrong role: the user's own dashboard
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScene />;
  if (!user) {
    const next = location.pathname + location.search;
    return (
      <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace state={{ from: next }} />
    );
  }
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
