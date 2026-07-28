import { AppError } from '@shared/errors/app-error.js';

/** Paridade com RegraNotificacaoRN: "Regra com o id X não encontrado." */
export class RegraNotificacaoNaoEncontradaError extends AppError {
  readonly code = 'REGRA_NOTIFICACAO_NAO_ENCONTRADA';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Regra de notificação "${identificador}" não foi encontrada`);
  }
}
