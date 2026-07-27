import { useEffect, useState } from 'react';
import { listAreas } from '../../api/services.js';
import { updateCustomerProfile } from '../../api/customer.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    address: user?.address_text ?? '',
    area_id: user?.area_id ?? '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    listAreas().then(setAreas).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const updated = await updateCustomerProfile({
        name: form.name,
        address: form.address,
        area_id: form.area_id || null,
      });
      updateUser(updated);
      showToast('Profile updated.', 'success');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update your profile.');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Profile</h1>
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
              value={user?.phone ?? ''}
              disabled
              className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 bg-gs-teal-100/40 text-gs-muted text-base"
            />
          </div>
          <div>
            <label htmlFor="area" className="block text-sm font-semibold text-gs-ink mb-1">
              Area
            </label>
            <select
              id="area"
              value={form.area_id}
              onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value }))}
              className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
            >
              <option value="">Select an area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gs-ink mb-1">
              Address
            </label>
            <textarea
              id="address"
              rows={3}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
    </div>
  );
}
