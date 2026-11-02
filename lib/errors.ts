/**
 * An error that carries the HTTP status the API should respond with. Services
 * throw these for expected failures (validation, not found, conflicts) so
 * routes do not have to guess.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
