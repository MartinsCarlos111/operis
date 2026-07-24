import { AppError } from '@shared/errors/app-error.js';

/** O nome do nível de acesso é único dentro do estabelecimento. */
export class NomeNivelJaExisteError extends AppError {
  readonly code = 'NOME_NIVEL_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(nome: string) {
    super(`Já existe um nível de acesso "${nome}" neste estabelecimento`);
  }
}
