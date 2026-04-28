import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('joan_auth_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
