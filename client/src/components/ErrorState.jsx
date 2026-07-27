import { AlertTriangle } from 'lucide-react';
import { Button } from './Button.jsx';

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-4">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gs-danger/10 text-gs-danger" aria-hidden="true">
        <AlertTriangle size={32} />
      </span>
      <h3 className="text-lg font-display font-semibold text-gs-teal-900">We hit a snag</h3>
      <p className="text-sm text-gs-muted max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
