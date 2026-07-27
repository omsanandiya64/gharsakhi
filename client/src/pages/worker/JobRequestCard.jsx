import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { ServiceIcon } from '../../components/ServiceIcon.jsx';

/**
 * §9.2 job request card. Payout is the worker's 80% cut
 * (worker_earning_paise) - the customer's full price never appears here.
 * Accept/decline are >=64px icon buttons with a label underneath, per §4.3
 * rule 3 - never text-only.
 */
export function JobRequestCard({ request, onAccept, onDecline, busy }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <ServiceIcon icon={request.service_icon} name={request.service_name} layout="horizontal" size={40} />
        <MoneyText paise={request.worker_earning_paise} className="text-2xl font-bold text-gs-teal-900 shrink-0" />
      </div>

      <div className="text-sm text-gs-muted space-y-0.5">
        <p className="font-semibold text-gs-ink">{request.area_name}</p>
        <p>{request.address_text}</p>
        <p>{request.customer_name}</p>
      </div>

      <div className="flex items-center justify-center gap-10 pt-1">
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          aria-label="Decline this job"
          className="flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gs-danger/10 text-gs-danger">
            <XCircle size={32} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-gs-danger">Decline</span>
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          aria-label="Accept this job"
          className="flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gs-online/10 text-gs-online">
            <CheckCircle2 size={32} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-gs-online">Accept</span>
        </button>
      </div>
    </Card>
  );
}
