import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { fetchMe } from '../api/authApi';
import { clearSession } from '../features/auth/session';
import { useSession } from '../features/auth/useSession';
import { authKeys } from '../lib/queryKeys';

export const AppLayout = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Validates the restored session against the backend on boot. A dead
  // session fails refresh in the interceptor, which clears it and lands the
  // user back on /login via RequireAuth.
  useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const handleLogout = () => {
    clearSession();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="app-header">
        <Link to="/loads" className="brand">
          🚚 DispatchBoard
        </Link>
        {session && (
          <div className="header-user">
            <span>
              {session.user.name} <span className="role-tag">{session.user.role}</span>
            </span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        )}
      </header>
      <Outlet />
    </>
  );
};
