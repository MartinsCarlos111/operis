import type {
  DadosConexaoTenant,
  TenantResolver,
} from '@shared/tenant-runtime/tenant-resolver.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';

/**
 * Implementação do TenantResolver (porta do Connection Manager) sobre o Control
 * Plane: busca o Tenant + sua configuração de banco no repositório e decifra a
 * senha só em memória, no momento da resolução. Vive na infra de operis_control
 * porque é aqui que faz sentido conhecer TenantRepository e EncryptionService.
 */
export class TenantResolverControlPlane implements TenantResolver {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async resolver(tenantId: string): Promise<DadosConexaoTenant | null> {
    const tenant = await this.tenants.buscarPorId(tenantId);
    if (!tenant || !tenant.estaAtivo() || !tenant.banco) {
      return null;
    }

    const banco = tenant.banco;
    return {
      host: banco.host,
      porta: banco.porta,
      nomeBanco: banco.nomeBanco,
      usuario: banco.usuario,
      senha: this.encryption.decifrar(banco.senhaCifrada),
      sslHabilitado: banco.sslHabilitado,
    };
  }
}
