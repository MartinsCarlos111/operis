/**
 * Base class for all *expected* domain/application errors — the ones that map to
 * a meaningful client response (404, 409, 422...). Framework-free on purpose so
 * the domain and application layers can throw these without knowing about HTTP.
 *
 * Unexpected/programmer errors should NOT extend this — let them bubble as 500.
 */
export abstract class AppError extends Error {
  /** Stable, machine-readable code (e.g. "USER_NOT_FOUND"). */
  abstract readonly code: string;
  /** Suggested HTTP status. The web layer decides how to use it. */
  abstract readonly httpStatus: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions | undefined);
    this.name = new.target.name;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
