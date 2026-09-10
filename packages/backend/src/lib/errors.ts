export class AppError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}
export const bad = (m: string) => new AppError('VALIDATION_ERROR', 400, m);
