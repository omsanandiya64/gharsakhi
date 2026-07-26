import { Errors } from '../utils/errors.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      return next(Errors.VALIDATION_ERROR(message));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.') || 'query'}: ${i.message}`)
        .join('; ');
      return next(Errors.VALIDATION_ERROR(message));
    }
    req.validatedQuery = result.data;
    next();
  };
}
