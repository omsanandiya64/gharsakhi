import { Inbox } from 'lucide-react';
import { Button } from './Button.jsx';

export function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-4">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gs-teal-100 text-gs-teal-600" aria-hidden="true">
        <Icon size={32} />
      </span>
      <h3 className="text-lg font-display font-semibold text-gs-teal-900">{title}</h3>
      {description && <p className="text-sm text-gs-muted max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
