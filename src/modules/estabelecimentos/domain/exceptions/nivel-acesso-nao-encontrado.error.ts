import { AppError } from '@shared/errors/app-error.js';

export class NivelAcessoNaoEncontradoError extends AppError {
  readonly code = 'NIVEL_ACESSO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Nível de acesso "${identificador}" não foi encontrado`);
  }
}
