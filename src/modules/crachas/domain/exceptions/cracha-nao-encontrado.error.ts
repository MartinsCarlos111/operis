import { AppError } from '@shared/errors/app-error.js';

export class CrachaNaoEncontradoError extends AppError {
  readonly code = 'CRACHA_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Crachá "${identificador}" não foi encontrado`);
  }
}
