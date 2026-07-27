import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Button } from '../../components/Button.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ username: '', password: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const { token, user } = await loginAdmin(form);
      login('admin', { token, user });
      showToast('Welcome back.', 'success');
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed.');
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gs-teal-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8 text-white">
          <ShieldCheck className="text-gs-marigold" size={28} aria-hidden="true" />
          <span className="font-display text-xl font-bold">GharSakhi Admin</span>
        </div>
        <div className="bg-white rounded-2xl p-6">
          <h1 className="text-lg font-display font-bold text-gs-teal-900 mb-6">Admin login</h1>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gs-ink mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
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
        </div>
      </div>
    </div>
  );
}
