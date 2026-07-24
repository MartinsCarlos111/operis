import { AppError } from '@shared/errors/app-error.js';

/** O nível de acesso informado não existe/não pertence ao estabelecimento do vínculo. */
export class NivelInvalidoParaEstabelecimentoError extends AppError {
  readonly code = 'NIVEL_INVALIDO_PARA_ESTABELECIMENTO';
  readonly httpStatus = 422;

  constructor(nivelAcessoId: string, estabelecimentoId: string) {
    super(
      `O nível de acesso "${nivelAcessoId}" não pertence ao estabelecimento "${estabelecimentoId}"`,
    );
  }
}
