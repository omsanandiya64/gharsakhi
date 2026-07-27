export function PlaceholderPage({ title, description }) {
  return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">{title}</h1>
      {description && <p className="mt-2 text-sm text-gs-muted max-w-sm mx-auto">{description}</p>}
    </div>
  );
}
