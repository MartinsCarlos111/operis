import type { SuperAdmin } from '../../domain/entities/super-admin.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

/** Nunca expõe o hash de senha. */
export interface SuperAdminDTO {
  idSuperAdmin: string;
  nome: string;
  email: string;
  status: StatusRecurso;
  criadoEm: string;
}

export function paraSuperAdminDTO(superAdmin: SuperAdmin): SuperAdminDTO {
  return {
    idSuperAdmin: superAdmin.idSuperAdmin,
    nome: superAdmin.nome,
    email: superAdmin.email.valor,
    status: superAdmin.status,
    criadoEm: superAdmin.criadoEm.toISOString(),
  };
}
