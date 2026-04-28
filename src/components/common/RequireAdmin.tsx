import { Navigate } from 'react-router-dom';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  try {
    const userStr = localStorage.getItem('joan_academic_user');
    if (!userStr) return <Navigate to="/login" replace />;
    const user = JSON.parse(userStr);
    if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
  } catch {
    return <Navigate to="/login" replace />;
  }
}
