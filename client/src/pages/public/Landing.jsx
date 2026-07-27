import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Search, CalendarCheck, ShieldCheck } from 'lucide-react';
import { listServices } from '../../api/services.js';
import { ServiceIcon } from '../../components/ServiceIcon.jsx';
import { Button } from '../../components/Button.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

const STEPS = [
  {
    icon: Search,
    title: 'Pick a service & area',
    description: 'Choose what you need done and where - we show you who is available right now.',
  },
  {
    icon: CalendarCheck,
    title: 'Book instantly',
    description: 'See the price upfront and book in a couple of taps. Your payment is held safely until the job is done.',
  },
  {
    icon: ShieldCheck,
    title: "Pay only when it's done",
    description: 'The worker is paid the moment the job is marked complete, and you can rate the experience.',
  },
];

function ServiceGridSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" role="status" aria-label="Loading services">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export default function Landing() {
  const [state, setState] = useState({ status: 'loading', services: [] });

  const load = useCallback(() => {
    setState({ status: 'loading', services: [] });
    listServices()
      .then((services) => setState({ status: 'ready', services }))
      .catch(() => setState({ status: 'error', services: [] }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gs-sand">
      <header className="px-4 py-4 max-w-[1200px] mx-auto flex items-center">
        <span className="font-display text-xl font-bold text-gs-teal-900 flex items-center gap-2">
          <HeartHandshake className="text-gs-marigold" size={28} aria-hidden="true" />
          GharSakhi
        </span>
      </header>

      <section className="px-4 py-10 md:py-16 max-w-[1200px] mx-auto text-center">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-gs-teal-900 max-w-2xl mx-auto">
          Trusted home help, on your schedule
        </h1>
        <p className="mt-4 text-base text-gs-muted max-w-xl mx-auto">
          GharSakhi connects your household with verified domestic workers for cleaning, cooking, and
          care - with upfront pricing and payment held safely until the job is done.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-stretch">
          <Button as={Link} to="/login/customer" variant="primary" className="sm:w-auto">
            I need help at home
          </Button>
          <Button as={Link} to="/login/worker" variant="marigold" className="sm:w-auto">
            I want to work
          </Button>
        </div>
      </section>

      <section className="px-4 py-10 max-w-[1200px] mx-auto">
        <h2 className="text-xl font-display font-bold text-gs-teal-900 text-center mb-8">
          Everything your home needs
        </h2>
        {state.status === 'loading' && <ServiceGridSkeleton />}
        {state.status === 'error' && <ErrorState message="Couldn't load services right now." onRetry={load} />}
        {state.status === 'ready' && (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {state.services.map((service) => (
              <ServiceIcon key={service.id} icon={service.icon} name={service.name} />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 py-10 md:py-16 max-w-[1200px] mx-auto">
        <h2 className="text-xl font-display font-bold text-gs-teal-900 text-center mb-8">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="bg-white rounded-2xl border border-gs-teal-100 p-6 text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gs-teal-100 text-gs-teal-600 mb-4" aria-hidden="true">
                <step.icon size={28} />
              </span>
              <p className="text-sm font-bold text-gs-marigold mb-1">Step {i + 1}</p>
              <h3 className="text-lg font-display font-semibold text-gs-teal-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gs-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-4 py-8 text-center text-sm text-gs-muted">
        &copy; {new Date().getFullYear()} GharSakhi
      </footer>
    </div>
  );
}
