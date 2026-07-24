import { AppError } from '@shared/errors/app-error.js';

/** Lançada ao tentar conceder a um nível uma permissão que não existe no catálogo. */
export class PermissaoDesconhecidaError extends AppError {
  readonly code = 'PERMISSAO_DESCONHECIDA';
  readonly httpStatus = 422;

  constructor(identificadores: string[]) {
    super(`Permissões desconhecidas no catálogo: ${identificadores.join(', ')}`);
  }
}
