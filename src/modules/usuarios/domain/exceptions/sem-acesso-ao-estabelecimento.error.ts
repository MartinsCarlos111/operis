import { AppError } from '@shared/errors/app-error.js';

/** Usuário autenticado, mas sem vínculo ativo com o estabelecimento do header. */
export class SemAcessoAoEstabelecimentoError extends AppError {
  readonly code = 'SEM_ACESSO_AO_ESTABELECIMENTO';
  readonly httpStatus = 404;

  constructor(estabelecimentoId: string) {
    super(`Sem vínculo ativo com o estabelecimento "${estabelecimentoId}"`);
  }
}
