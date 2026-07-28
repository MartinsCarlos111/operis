import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com EstabelecimentoImpressoraRN.Adicionar:
 * "Código do estabelecimento X já está cadastrado para a impressora Y."
 */
export class VinculoJaExisteError extends AppError {
  readonly code = 'VINCULO_ESTAB_IMPRESSORA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(estabelecimentoId: string, impressoraId: string) {
    super(
      `Impressora "${impressoraId}" já está vinculada ao estabelecimento "${estabelecimentoId}".`,
    );
  }
}
