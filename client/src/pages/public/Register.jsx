import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { registerCustomer, registerWorker } from '../../api/auth.js';
import { listServices, listAreas } from '../../api/services.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Button } from '../../components/Button.jsx';

const ROLE_CONFIG = {
  customer: { title: 'Create your customer account', loginPath: '/login/customer' },
  worker: { title: 'Create your worker account', loginPath: '/login/worker' },
};

function Field({ label, id, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gs-ink mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
      />
    </div>
  );
}

function CheckboxGrid({ legend, items, selected, onToggle }) {
  return (
    <fieldset>
      <legend className="block text-sm font-semibold text-gs-ink mb-2">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 min-h-[48px] px-3 rounded-xl border border-gs-teal-100 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
              className="w-5 h-5 accent-gs-teal-600 shrink-0"
            />
            {item.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Register() {
  const { role } = useParams();
  const config = ROLE_CONFIG[role];
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', area_id: '', address: '' });
  const [serviceIds, setServiceIds] = useState([]);
  const [areaIds, setAreaIds] = useState([]);
  const [areas, setAreas] = useState([]);
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!config) return;
    listAreas()
      .then(setAreas)
      .catch(() => showToast('Could not load areas. Try reloading the page.', 'error'));
    if (role === 'worker') {
      listServices()
        .then(setServices)
        .catch(() => showToast('Could not load services. Try reloading the page.', 'error'));
    }
  }, [config, role, showToast]);

  if (!config) return <Navigate to="/" replace />;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggle(list, setList, id) {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (role === 'worker' && (serviceIds.length === 0 || areaIds.length === 0)) {
      setError('Select at least one service and one area.');
      return;
    }
    setStatus('loading');
    try {
      const payload =
        role === 'customer'
          ? {
              name: form.name,
              phone: form.phone,
              email: form.email || undefined,
              password: form.password,
              area_id: form.area_id || undefined,
              address: form.address || undefined,
            }
          : {
              name: form.name,
              phone: form.phone,
              email: form.email || undefined,
              password: form.password,
              service_ids: serviceIds,
              area_ids: areaIds,
            };
      const registerFn = role === 'customer' ? registerCustomer : registerWorker;
      const { token, user } = await registerFn(payload);
      login(role, { token, user });
      showToast(`Welcome to GharSakhi, ${user.name}!`, 'success');
      navigate(`/${role}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please check your details.');
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gs-sand px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <HeartHandshake className="text-gs-marigold" size={28} aria-hidden="true" />
          <span className="font-display text-xl font-bold text-gs-teal-900">GharSakhi</span>
        </Link>
        <div className="bg-white rounded-2xl border border-gs-teal-100 p-6">
          <h1 className="text-lg font-display font-bold text-gs-teal-900 mb-6">{config.title}</h1>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Full name" id="name" value={form.name} onChange={(v) => update('name', v)} required />
            <Field label="Phone number" id="phone" type="tel" value={form.phone} onChange={(v) => update('phone', v)} required />
            <Field label="Email (optional)" id="email" type="email" value={form.email} onChange={(v) => update('email', v)} />
            <Field
              label="Password"
              id="password"
              type="password"
              value={form.password}
              onChange={(v) => update('password', v)}
              required
            />

            {role === 'customer' && (
              <>
                <div>
                  <label htmlFor="area_id" className="block text-sm font-semibold text-gs-ink mb-1">
                    Area
                  </label>
                  <select
                    id="area_id"
                    value={form.area_id}
                    onChange={(e) => update('area_id', e.target.value)}
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
                <Field label="Address (optional)" id="address" value={form.address} onChange={(v) => update('address', v)} />
              </>
            )}

            {role === 'worker' && (
              <>
                <CheckboxGrid
                  legend="Services you offer"
                  items={services}
                  selected={serviceIds}
                  onToggle={(id) => toggle(serviceIds, setServiceIds, id)}
                />
                <CheckboxGrid
                  legend="Areas you cover"
                  items={areas}
                  selected={areaIds}
                  onToggle={(id) => toggle(areaIds, setAreaIds, id)}
                />
              </>
            )}

            {error && (
              <p className="text-sm text-gs-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-gs-muted">
            Already have an account?{' '}
            <Link to={config.loginPath} className="text-gs-teal-600 font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
