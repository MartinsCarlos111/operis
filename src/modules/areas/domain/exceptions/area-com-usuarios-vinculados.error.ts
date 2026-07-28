import { AppError } from '@shared/errors/app-error.js';

/**
 * Paridade com AreaRN.ExcluirArea: bloqueia a exclusão quando há usuários
 * relacionados à área.
 */
export class AreaComUsuariosVinculadosError extends AppError {
  readonly code = 'AREA_COM_USUARIOS_VINCULADOS';
  readonly httpStatus = 409;

  constructor(codigo: string, quantidade: number) {
    super(
      `Não foi possível deletar a área '${codigo}', há '${quantidade}' usuários relacionados a esta área.`,
    );
  }
}
