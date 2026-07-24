import type { TenantAdministrador } from '../entities/tenant-administrador.js';
import type { Email } from '../value-objects/email.js';

export interface TenantAdministradorRepository {
  buscarPorEmail(email: Email): Promise<TenantAdministrador | null>;
  listarPorTenant(tenantId: string): Promise<TenantAdministrador[]>;
  salvar(administrador: TenantAdministrador): Promise<void>;
}
