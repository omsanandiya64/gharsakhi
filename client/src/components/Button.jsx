import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-gs-teal-600 text-white hover:bg-gs-teal-900 disabled:bg-gs-muted',
  secondary:
    'bg-white text-gs-teal-600 border-2 border-gs-teal-600 hover:bg-gs-teal-100 disabled:border-gs-muted disabled:text-gs-muted',
  danger: 'bg-gs-danger text-white hover:opacity-90 disabled:bg-gs-muted',
  ghost: 'bg-transparent text-gs-teal-600 hover:bg-gs-teal-100 disabled:text-gs-muted',
  marigold: 'bg-gs-marigold text-gs-ink hover:opacity-90 disabled:bg-gs-muted',
};

export const Button = forwardRef(function Button(
  { as: Component = 'button', variant = 'primary', fullWidth = false, className = '', type, children, ...props },
  ref
) {
  // Native buttons default to type="submit" inside a <form>, which would fire
  // an accidental submit on any Button used just for navigation/actions - default
  // to "button" unless the caller explicitly wants a submit button. Non-button
  // elements (e.g. `as={Link}`) don't take a `type` attribute at all.
  const resolvedType = Component === 'button' ? type || 'button' : undefined;
  return (
    <Component
      ref={ref}
      type={resolvedType}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] px-5 rounded-xl font-semibold text-base transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});
