import { useCallback, useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { listServices, listAreas } from '../../api/services.js';
import { matchWorkers } from '../../api/bookings.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';
import { OnlineRing } from '../../components/OnlineRing.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

export default function BrowseWorkers() {
  const { serviceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [service, setService] = useState(location.state?.service ?? null);
  const [serviceStatus, setServiceStatus] = useState(location.state?.service ? 'ready' : 'loading');
  const [areas, setAreas] = useState([]);
  const [areaId, setAreaId] = useState(location.state?.areaId ?? user?.area_id ?? '');
  const [state, setState] = useState({ status: 'idle', workers: [] });

  useEffect(() => {
    listAreas()
      .then(setAreas)
      .catch(() => showToast('Could not load areas. Try reloading the page.', 'error'));
  }, [showToast]);

  const loadService = useCallback(() => {
    if (location.state?.service) {
      setService(location.state.service);
      setServiceStatus('ready');
      return;
    }
    setServiceStatus('loading');
    listServices()
      .then((services) => {
        const found = services.find((s) => String(s.id) === String(serviceId));
        if (found) {
          setService(found);
          setServiceStatus('ready');
        } else {
          setServiceStatus('error');
        }
      })
      .catch(() => setServiceStatus('error'));
  }, [location.state, serviceId]);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const load = useCallback(() => {
    if (!areaId) {
      setState({ status: 'idle', workers: [] });
      return;
    }
    setState({ status: 'loading', workers: [] });
    matchWorkers({ service_id: serviceId, area_id: areaId })
      .then((workers) => setState({ status: 'ready', workers }))
      .catch(() => setState({ status: 'error', workers: [] }));
  }, [serviceId, areaId]);

  useEffect(() => {
    load();
  }, [load]);

  if (serviceStatus === 'loading') {
    return <SkeletonList rows={4} rowClassName="h-20" />;
  }

  if (serviceStatus === 'error' || !service) {
    return <ErrorState message="Couldn't load this service." onRetry={loadService} />;
  }

  const areaName = areas.find((a) => String(a.id) === String(areaId))?.name ?? 'this area';

  function handleBook(worker) {
    navigate('/customer/book/confirm', { state: { service, worker, areaId, areaName } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-gs-teal-900">{service.name}</h1>
        <p className="text-sm text-gs-muted">Pick an area to see who's available right now.</p>
      </div>

      <div>
        <label htmlFor="area" className="block text-sm font-semibold text-gs-ink mb-1">
          Area
        </label>
        <select
          id="area"
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="w-full sm:w-72 min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
        >
          <option value="">Select an area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'idle' && <p className="text-sm text-gs-muted">Select an area above to see available workers.</p>}

      {state.status === 'loading' && <SkeletonList rows={3} rowClassName="h-28" />}

      {state.status === 'error' && <ErrorState message="Couldn't load available workers." onRetry={load} />}

      {state.status === 'ready' && state.workers.length === 0 && (
        <EmptyState
          title="No one's available right now"
          description={`No one is online in ${areaName} for ${service.name} right now. Try another area or check back shortly.`}
        />
      )}

      {state.status === 'ready' && state.workers.length > 0 && (
        <div className="space-y-3">
          {state.workers.map((worker) => (
            <Card key={worker.id} className="flex items-center gap-4">
              <OnlineRing photoUrl={worker.photo_url} name={worker.name} online={worker.is_online} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gs-ink truncate">{worker.name}</p>
                <Rating value={Number(worker.rating_avg)} count={worker.rating_count} size={14} />
                <p className="text-xs text-gs-muted mt-0.5">{worker.completed_jobs} jobs done</p>
              </div>
              <div className="text-right shrink-0">
                <MoneyText paise={service.price_paise} className="block font-bold text-gs-teal-900" />
                <Button variant="primary" className="mt-2 min-h-[40px] px-4" onClick={() => handleBook(worker)}>
                  Book
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
