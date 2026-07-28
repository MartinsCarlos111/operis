import { AppError } from '@shared/errors/app-error.js';

/** Paridade com CrachaRN.AdicionarCracha: "Crachá 'X' já cadastrado." */
export class CodigoCrachaJaExisteError extends AppError {
  readonly code = 'CODIGO_CRACHA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Crachá '${codigo}' já cadastrado.`);
  }
}
