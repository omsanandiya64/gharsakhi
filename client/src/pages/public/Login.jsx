import { useState } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { loginCustomer, loginWorker } from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Button } from '../../components/Button.jsx';

const ROLE_CONFIG = {
  customer: {
    title: 'Customer login',
    loginFn: loginCustomer,
    registerPath: '/register/customer',
    otherRolePath: '/login/worker',
    otherRoleLabel: 'Looking for work instead?',
  },
  worker: {
    title: 'Worker login',
    loginFn: loginWorker,
    registerPath: '/register/worker',
    otherRolePath: '/login/customer',
    otherRoleLabel: 'Need help at home instead?',
  },
};

export default function Login() {
  const { role } = useParams();
  const config = ROLE_CONFIG[role];
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  if (!config) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const { token, user } = await config.loginFn(form);
      login(role, { token, user });
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(`/${role}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your details.');
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gs-sand px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <HeartHandshake className="text-gs-marigold" size={28} aria-hidden="true" />
          <span className="font-display text-xl font-bold text-gs-teal-900">GharSakhi</span>
        </Link>
        <div className="bg-white rounded-2xl border border-gs-teal-100 p-6">
          <h1 className="text-lg font-display font-bold text-gs-teal-900 mb-6">{config.title}</h1>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gs-ink mb-1">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gs-ink mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
              />
            </div>
            {error && (
              <p className="text-sm text-gs-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-gs-muted">
            New here?{' '}
            <Link to={config.registerPath} className="text-gs-teal-600 font-semibold">
              Register
            </Link>
          </p>
          <p className="mt-2 text-sm text-center text-gs-muted">
            <Link to={config.otherRolePath} className="text-gs-teal-600 font-semibold">
              {config.otherRoleLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
