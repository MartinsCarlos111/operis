import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com ImpressoraRN.AdicionarImpressora:
 * "Código da impressora 'X' já está cadastrado."
 */
export class CodigoImpressoraJaExisteError extends AppError {
  readonly code = 'CODIGO_IMPRESSORA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Código da impressora '${codigo}' já está cadastrado.`);
  }
}
