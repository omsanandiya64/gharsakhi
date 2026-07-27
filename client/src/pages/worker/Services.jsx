import { useCallback, useEffect, useState } from 'react';
import { listServices } from '../../api/services.js';
import { getWorkerMe, setWorkerServices } from '../../api/worker.js';
import { useToast } from '../../components/Toast.jsx';
import { Button } from '../../components/Button.jsx';
import { ServiceIcon } from '../../components/ServiceIcon.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

export default function Services() {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', all: [], selected: [] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([listServices(), getWorkerMe()])
      .then(([all, me]) => setState({ status: 'ready', all, selected: me.services.map((s) => s.id) }))
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id) {
    setState((s) => ({
      ...s,
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    }));
  }

  async function handleSave() {
    if (state.selected.length === 0) {
      showToast('Select at least one service.', 'error');
      return;
    }
    setSaving(true);
    try {
      await setWorkerServices(state.selected);
      showToast('Services updated.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Could not update your services.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (state.status === 'loading') return <SkeletonList rows={4} rowClassName="h-24" />;
  if (state.status === 'error') return <ErrorState message="Couldn't load your services." onRetry={load} />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">My Services</h1>
      <p className="text-sm text-gs-muted">Choose every service you offer.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {state.all.map((service) => {
          const checked = state.selected.includes(service.id);
          return (
            <label
              key={service.id}
              className={`relative flex justify-center p-4 rounded-2xl border-2 cursor-pointer ${
                checked ? 'border-gs-teal-600 bg-gs-teal-100' : 'border-gs-teal-100 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(service.id)}
                aria-label={service.name}
                className="absolute top-3 right-3 w-5 h-5 accent-gs-teal-600"
              />
              <ServiceIcon icon={service.icon} name={service.name} size={40} />
            </label>
          );
        })}
      </div>

      <Button variant="primary" fullWidth disabled={saving} onClick={handleSave}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}
