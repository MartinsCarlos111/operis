import { AppError } from '@shared/errors/app-error.js';

export class VinculoAreaUsuarioNaoEncontradoError extends AppError {
  readonly code = 'VINCULO_AREA_USUARIO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(areaId: string, usuarioId: string) {
    super(`Vínculo entre área "${areaId}" e usuário "${usuarioId}" não foi encontrado`);
  }
}
