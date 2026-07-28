import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com RegraNotificacaoRN.AdicionarRegraNotificacao:
 * "Regra com o código 'X' já cadastrada."
 */
export class CodigoRegraJaExisteError extends AppError {
  readonly code = 'CODIGO_REGRA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Regra com o código '${codigo}' já cadastrada.`);
  }
}
