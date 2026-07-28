import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com EstabelecimentoImpressoraRN.Validar: "Código impressora X não
 * está cadastrado" / "Código Estabelecimento X não está cadastrado".
 */
export class ImpressoraInexistenteError extends AppError {
  readonly code = 'IMPRESSORA_INEXISTENTE';
  readonly httpStatus = 404;

  constructor(impressoraId: string) {
    super(`Impressora "${impressoraId}" não está cadastrada.`);
  }
}

export class EstabelecimentoInexistenteError extends AppError {
  readonly code = 'ESTABELECIMENTO_INEXISTENTE';
  readonly httpStatus = 404;

  constructor(estabelecimentoId: string) {
    super(`Estabelecimento "${estabelecimentoId}" não está cadastrado.`);
  }
}
