export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  VALIDATION_ERROR: (message = 'Invalid request') => new AppError(400, 'VALIDATION_ERROR', message),
  INVALID_CREDENTIALS: () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials'),
  UNAUTHORIZED: () => new AppError(401, 'UNAUTHORIZED', 'Authentication required'),
  FORBIDDEN: () => new AppError(403, 'FORBIDDEN', 'You do not have access to this resource'),
  ACCOUNT_BLOCKED: () => new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked'),
  NOT_FOUND: (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message),
  PHONE_ALREADY_REGISTERED: () => new AppError(409, 'PHONE_ALREADY_REGISTERED', 'Phone number is already registered'),
  EMAIL_ALREADY_REGISTERED: () => new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Email is already registered'),
  CONFLICT: (message = 'Conflict') => new AppError(409, 'CONFLICT', message),
  INSUFFICIENT_BALANCE: () => new AppError(402, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance'),
  WORKER_UNAVAILABLE: () => new AppError(409, 'WORKER_UNAVAILABLE', 'Worker is not available for this service/area right now'),
  INVALID_TRANSITION: () => new AppError(409, 'INVALID_TRANSITION', 'This booking cannot change to that status from its current state'),
  ALREADY_REVIEWED: () => new AppError(409, 'ALREADY_REVIEWED', 'This booking has already been reviewed'),
};
