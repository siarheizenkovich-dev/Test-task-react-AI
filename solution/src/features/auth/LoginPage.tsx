import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../../api/authApi';
import { getApiErrorMessage } from '../../lib/apiError';
import { setSession } from './session';
import { useSession } from './useSession';

export const LoginPage = () => {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
  const target = from ? `${from.pathname}${from.search}` : '/loads';

  const loginMutation = useMutation({
    mutationFn: () => login(username.trim(), password),
    onSuccess: (auth) => {
      setSession({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        user: auth.user,
      });
      navigate(target, { replace: true });
    },
  });

  if (session) return <Navigate to={target} replace />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    loginMutation.mutate();
  };

  return (
    <main className="page login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>DispatchBoard</h1>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {loginMutation.isError && (
          <p className="error">{getApiErrorMessage(loginMutation.error)}</p>
        )}
        <button
          className="primary"
          type="submit"
          disabled={loginMutation.isPending || !username.trim() || !password}
        >
          {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="hint">
          Try <code>dispatcher / dispatcher123</code> or <code>driver / driver123</code>
        </p>
      </form>
    </main>
  );
};
