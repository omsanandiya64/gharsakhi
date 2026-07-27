import * as Icons from 'lucide-react';

/**
 * Renders the lucide icon named in services.icon at >=40px, always paired
 * with its label - accessibility rule #1 requires the label be visible, not
 * an aria-label substitute, so low-literacy users can still recognize the icon.
 */
export function ServiceIcon({ icon, name, size = 40, layout = 'vertical', className = '' }) {
  const IconComponent = Icons[icon] || Icons.HelpCircle;
  const isVertical = layout === 'vertical';

  return (
    <div className={`flex ${isVertical ? 'flex-col items-center text-center gap-2' : 'flex-row items-center gap-3'} ${className}`}>
      <span
        className="flex items-center justify-center rounded-2xl bg-gs-teal-100 text-gs-teal-600 p-3 shrink-0"
        aria-hidden="true"
      >
        <IconComponent size={size} strokeWidth={1.75} />
      </span>
      <span className="text-sm font-semibold text-gs-ink">{name}</span>
    </div>
  );
}
