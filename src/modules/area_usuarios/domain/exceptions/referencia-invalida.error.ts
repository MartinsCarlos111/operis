import { AppError } from '@shared/errors/app-error.js';

/** Paridade com AreaUsuarioRN.Validar: área/usuário inexistentes. */
export class AreaInexistenteError extends AppError {
  readonly code = 'AREA_INEXISTENTE';
  readonly httpStatus = 404;

  constructor(areaId: string) {
    super(`Área "${areaId}" não está cadastrada.`);
  }
}

export class UsuarioInexistenteError extends AppError {
  readonly code = 'USUARIO_INEXISTENTE';
  readonly httpStatus = 404;

  constructor(usuarioId: string) {
    super(`Usuário "${usuarioId}" não está cadastrado.`);
  }
}
