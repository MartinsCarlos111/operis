import { AppError } from '@shared/errors/app-error.js';

export class EmailInvalidoError extends AppError {
  readonly code = 'EMAIL_INVALIDO';
  readonly httpStatus = 422;

  constructor(valor: string) {
    super(`"${valor}" não é um endereço de email válido`);
  }
}
