import type { AreaUsuario } from '../../domain/entities/area-usuario.js';

/** Saída de um vínculo área ↔ usuário. */
export interface AreaUsuarioDTO {
  idArea: string;
  idUsuario: string;
  criadoEm: string;
}

export function paraAreaUsuarioDTO(vinculo: AreaUsuario): AreaUsuarioDTO {
  return {
    idArea: vinculo.areaId,
    idUsuario: vinculo.usuarioId,
    criadoEm: vinculo.criadoEm.toISOString(),
  };
}
