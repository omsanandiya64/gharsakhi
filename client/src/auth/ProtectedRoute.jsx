import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { loginPathForRole, homePathForRole } from './storage.js';

export function ProtectedRoute({ role, children }) {
  const { token, role: currentRole } = useAuth();

  if (!token) {
    return <Navigate to={loginPathForRole(role)} replace />;
  }

  if (currentRole !== role) {
    return <Navigate to={homePathForRole(currentRole)} replace />;
  }

  return children;
}
