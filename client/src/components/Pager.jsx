import { Button } from './Button.jsx';

export function Pager({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="secondary" className="px-4 min-h-[44px]" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-gs-muted">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        className="px-4 min-h-[44px]"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
