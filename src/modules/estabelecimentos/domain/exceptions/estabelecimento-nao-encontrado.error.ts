import { AppError } from '@shared/errors/app-error.js';

export class EstabelecimentoNaoEncontradoError extends AppError {
  readonly code = 'ESTABELECIMENTO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Estabelecimento "${identificador}" não foi encontrado`);
  }
}
