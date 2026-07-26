import { verifyToken } from '../utils/jwt.js';
import { Errors } from '../utils/errors.js';

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

    if (payload.role !== requiredRole) return next(Errors.FORBIDDEN());

    req.user = { id: payload.id, role: payload.role };
    next();
  };
}
