import { AppError } from '@shared/errors/app-error.js';

export class UsuarioNaoEncontradoError extends AppError {
  readonly code = 'USUARIO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Usuário "${identificador}" não foi encontrado`);
  }
}
