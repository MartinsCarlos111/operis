import { AppError } from '@shared/errors/app-error.js';

export class CondicaoNotificacaoNaoEncontradaError extends AppError {
  readonly code = 'CONDICAO_NOTIFICACAO_NAO_ENCONTRADA';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Condição de notificação "${identificador}" não foi encontrada`);
  }
}
