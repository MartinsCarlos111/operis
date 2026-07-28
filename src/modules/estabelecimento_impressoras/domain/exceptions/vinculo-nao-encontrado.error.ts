import { AppError } from '@shared/errors/app-error.js';

export class VinculoNaoEncontradoError extends AppError {
  readonly code = 'VINCULO_ESTAB_IMPRESSORA_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(estabelecimentoId: string, impressoraId: string) {
    super(
      `Vínculo entre estabelecimento "${estabelecimentoId}" e impressora "${impressoraId}" não foi encontrado`,
    );
  }
}
