import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerMe, updateWorkerProfile } from '../../api/worker.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

export default function Profile() {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', me: null });
  const [form, setForm] = useState({ name: '', bio: '', photo_url: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setState({ status: 'loading', me: null });
    getWorkerMe()
      .then((me) => {
        setState({ status: 'ready', me });
        setForm({ name: me.name ?? '', bio: me.bio ?? '', photo_url: me.photo_url ?? '' });
      })
      .catch(() => setState({ status: 'error', me: null }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const updated = await updateWorkerProfile({
        name: form.name,
        bio: form.bio,
        photo_url: form.photo_url || null,
      });
      updateUser(updated);
      showToast('Profile updated.', 'success');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update your profile.');
    } finally {
      setStatus('idle');
    }
  }

  if (state.status === 'loading') return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (state.status === 'error' || !state.me) return <ErrorState message="Couldn't load your profile." onRetry={load} />;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Profile</h1>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gs-muted">Rating</p>
          <Rating value={Number(state.me.rating_avg)} count={state.me.rating_count} size={16} />
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gs-ink mb-1">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gs-ink mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={state.me.phone ?? ''}
              disabled
              className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 bg-gs-teal-100/40 text-gs-muted text-base"
            />
          </div>
          <div>
            <label htmlFor="photo_url" className="block text-sm font-semibold text-gs-ink mb-1">
              Photo URL (optional)
            </label>
            <input
              id="photo_url"
              type="text"
              value={form.photo_url}
              onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
              className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-semibold text-gs-ink mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
            />
          </div>
          {error && (
            <p className="text-sm text-gs-danger" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" fullWidth disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </Card>

      <div className="flex flex-wrap gap-3 justify-center text-sm font-semibold text-gs-teal-600">
        <Link to="/worker/services" className="min-h-[48px] flex items-center px-3">
          My Services
        </Link>
        <Link to="/worker/areas" className="min-h-[48px] flex items-center px-3">
          My Areas
        </Link>
        <Link to="/worker/reviews" className="min-h-[48px] flex items-center px-3">
          My Reviews
        </Link>
      </div>
    </div>
  );
}
