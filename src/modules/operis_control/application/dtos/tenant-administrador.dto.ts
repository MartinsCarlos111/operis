import type { TenantAdministrador } from '../../domain/entities/tenant-administrador.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

/** Nunca expõe o hash de senha. */
export interface TenantAdministradorDTO {
  idTenantAdministrador: string;
  tenantId: string;
  nome: string;
  email: string;
  status: StatusRecurso;
  criadoEm: string;
}

export function paraTenantAdministradorDTO(admin: TenantAdministrador): TenantAdministradorDTO {
  return {
    idTenantAdministrador: admin.idTenantAdministrador,
    tenantId: admin.tenantId,
    nome: admin.nome,
    email: admin.email.valor,
    status: admin.status,
    criadoEm: admin.criadoEm.toISOString(),
  };
}
