import { AppError } from '@shared/errors/app-error.js';

export class EmailJaEmUsoError extends AppError {
  readonly code = 'EMAIL_JA_EM_USO';
  readonly httpStatus = 409;

  constructor(email: string) {
    super(`O email "${email}" já está em uso`);
  }
}
