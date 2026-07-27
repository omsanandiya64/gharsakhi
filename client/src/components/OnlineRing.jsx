import { User } from 'lucide-react';

/**
 * §4.3 rule 2: online status is a pulsing green ring, not a text label -
 * animated, but must respect prefers-reduced-motion (ring stays solid, stops
 * pulsing). The solid ring-2 border is always present when online, in both
 * motion states; the expanding "ping" halo is purely additive and only
 * renders under motion-safe.
 */
export function OnlineRing({ photoUrl, name, online, size = 56 }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {online && (
        <span
          className="absolute inset-0 rounded-full bg-gs-online/60 motion-safe:animate-ping motion-reduce:hidden"
          aria-hidden="true"
        />
      )}
      <span
        className={`relative inline-flex items-center justify-center w-full h-full rounded-full bg-gs-teal-100 text-gs-teal-600 overflow-hidden ring-2 ${
          online ? 'ring-gs-online' : 'ring-transparent'
        }`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={size * 0.5} aria-hidden="true" />
        )}
      </span>
      <span className="sr-only">{name} is {online ? 'online' : 'offline'}</span>
    </span>
  );
}
