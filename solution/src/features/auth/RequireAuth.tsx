import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './useSession';

export const RequireAuth = () => {
  const session = useSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};
