import { AppError } from '@shared/errors/app-error.js';

export class AreaNaoEncontradaError extends AppError {
  readonly code = 'AREA_NAO_ENCONTRADA';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Área "${identificador}" não foi encontrada`);
  }
}
