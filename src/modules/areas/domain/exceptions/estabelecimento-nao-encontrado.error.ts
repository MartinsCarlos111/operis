import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com AreaRN.ValidarArea: "Estabelecimento com o código X não está
 * cadastrado". Aqui o estabelecimento é o do contexto ativo (header
 * x-estabelecimento-id), então na prática sinaliza contexto inconsistente.
 */
export class EstabelecimentoNaoEncontradoError extends AppError {
  readonly code = 'ESTABELECIMENTO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Estabelecimento "${identificador}" não está cadastrado`);
  }
}
