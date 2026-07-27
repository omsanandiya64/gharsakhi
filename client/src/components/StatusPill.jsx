import { Clock, ThumbsUp, XCircle, CheckCircle2, Ban } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, bg: 'bg-gs-marigold-100', text: 'text-gs-marigold' },
  accepted: { label: 'Accepted', icon: ThumbsUp, bg: 'bg-gs-teal-100', text: 'text-gs-teal-600' },
  declined: { label: 'Declined', icon: XCircle, bg: 'bg-gs-danger/10', text: 'text-gs-danger' },
  completed: { label: 'Completed', icon: CheckCircle2, bg: 'bg-gs-online/10', text: 'text-gs-online' },
  cancelled: { label: 'Cancelled', icon: Ban, bg: 'bg-gs-muted/10', text: 'text-gs-muted' },
};

export function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
      <Icon size={16} aria-hidden="true" />
      {config.label}
    </span>
  );
}
