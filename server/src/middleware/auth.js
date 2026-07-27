import { verifyToken } from '../utils/jwt.js';
import { Errors } from '../utils/errors.js';

/**
 * `auth(role)` requires that exact role. `auth()` with no argument accepts
 * any authenticated actor regardless of role - used only by routes that are
 * genuinely role-agnostic (push subscriptions apply the same way to a
 * customer, worker, or admin session).
 */
export function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(Errors.UNAUTHORIZED());

    let payload;
    try {
      payload = verifyToken(header.slice(7));
    } catch {
      return next(Errors.UNAUTHORIZED());
    }

    if (requiredRole && payload.role !== requiredRole) return next(Errors.FORBIDDEN());

    req.user = { id: payload.id, role: payload.role };
    next();
  };
}
