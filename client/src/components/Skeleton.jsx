export function Skeleton({ className = '' }) {
  return <div className={`motion-safe:animate-pulse bg-gs-teal-100 rounded-lg ${className}`} aria-hidden="true" />;
}

export function SkeletonList({ rows = 3, rowClassName = 'h-20' }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${rowClassName}`} />
      ))}
    </div>
  );
}
