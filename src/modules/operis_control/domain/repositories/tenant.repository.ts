import type { Tenant } from '../entities/tenant.js';
import type { Slug } from '../value-objects/slug.js';

/**
 * Porta do agregado Tenant. `salvar` persiste o tenant E sua configuração de
 * banco atomicamente (são o mesmo agregado).
 */
export interface TenantRepository {
  buscarPorId(id: string): Promise<Tenant | null>;
  buscarPorSlug(slug: Slug): Promise<Tenant | null>;
  listar(): Promise<Tenant[]>;
  salvar(tenant: Tenant): Promise<void>;
}
