import { formatMoney } from '../lib/format.js';

/**
 * Money is always rendered in IBM Plex Mono (font-mono in tailwind.config.js)
 * so digits don't shift width as a balance changes.
 */
export function MoneyText({ paise, className = '', ...props }) {
  return (
    <span className={`font-mono tabular-nums ${className}`} {...props}>
      {formatMoney(paise)}
    </span>
  );
}
