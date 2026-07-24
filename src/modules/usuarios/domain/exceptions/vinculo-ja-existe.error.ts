import { AppError } from '@shared/errors/app-error.js';

export class VinculoJaExisteError extends AppError {
  readonly code = 'VINCULO_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(usuarioId: string, estabelecimentoId: string) {
    super(
      `O usuário "${usuarioId}" já possui vínculo com o estabelecimento "${estabelecimentoId}"`,
    );
  }
}
