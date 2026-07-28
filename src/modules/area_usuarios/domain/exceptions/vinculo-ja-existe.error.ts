import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com AreaUsuarioRN.Adicionar:
 * "Relacionamento já cadastrado para Área e Usuário selecionados."
 */
export class VinculoAreaUsuarioJaExisteError extends AppError {
  readonly code = 'VINCULO_AREA_USUARIO_JA_EXISTE';
  readonly httpStatus = 409;

  constructor() {
    super('Relacionamento já cadastrado para Área e Usuário selecionados.');
  }
}
