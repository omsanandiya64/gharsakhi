import { useCallback, useEffect, useState } from 'react';
import { listAreas } from '../../api/services.js';
import { getWorkerMe, setWorkerAreas } from '../../api/worker.js';
import { useToast } from '../../components/Toast.jsx';
import { Button } from '../../components/Button.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

export default function Areas() {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', all: [], selected: [] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([listAreas(), getWorkerMe()])
      .then(([all, me]) => setState({ status: 'ready', all, selected: me.areas.map((a) => a.id) }))
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
      showToast('Select at least one area.', 'error');
      return;
    }
    setSaving(true);
    try {
      await setWorkerAreas(state.selected);
      showToast('Areas updated.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Could not update your areas.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (state.status === 'loading') return <SkeletonList rows={4} rowClassName="h-14" />;
  if (state.status === 'error') return <ErrorState message="Couldn't load your areas." onRetry={load} />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">My Areas</h1>
      <p className="text-sm text-gs-muted">Choose every area you cover.</p>

      <div className="space-y-2">
        {state.all.map((area) => {
          const checked = state.selected.includes(area.id);
          return (
            <label
              key={area.id}
              className={`flex items-center gap-3 min-h-[48px] px-4 rounded-xl border-2 cursor-pointer ${
                checked ? 'border-gs-teal-600 bg-gs-teal-100' : 'border-gs-teal-100 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(area.id)}
                className="w-5 h-5 accent-gs-teal-600 shrink-0"
              />
              <span className="text-sm font-semibold text-gs-ink">{area.name}</span>
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
