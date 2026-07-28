import type { PrismaClient } from '@prisma/client';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarTenantUseCase } from './application/use-cases/criar-tenant.use-case.js';
import { ListarTenantsUseCase } from './application/use-cases/listar-tenants.use-case.js';
import { TestarConexaoTenantUseCase } from './application/use-cases/testar-conexao-tenant.use-case.js';
import { CriarSuperAdminUseCase } from './application/use-cases/criar-super-admin.use-case.js';
import { AutenticarSuperAdminUseCase } from './application/use-cases/autenticar-super-admin.use-case.js';
import { AutenticarTenantAdministradorUseCase } from './application/use-cases/autenticar-tenant-administrador.use-case.js';
import { ConfigurarRabbitMqTenantUseCase } from './application/use-cases/configurar-rabbitmq-tenant.use-case.js';
import { ObterRabbitMqTenantUseCase } from './application/use-cases/obter-rabbitmq-tenant.use-case.js';
import { ConfigurarSmtpTenantUseCase } from './application/use-cases/configurar-smtp-tenant.use-case.js';
import { ObterSmtpTenantUseCase } from './application/use-cases/obter-smtp-tenant.use-case.js';
import { PrismaTenantRepository } from './infrastructure/persistence/prisma-tenant.repository.js';
import { PrismaConfiguracaoRabbitMqTenantRepository } from './infrastructure/persistence/prisma-configuracao-rabbitmq-tenant.repository.js';
import { PrismaConfiguracaoSmtpTenantRepository } from './infrastructure/persistence/prisma-configuracao-smtp-tenant.repository.js';
import { PrismaSuperAdminRepository } from './infrastructure/persistence/prisma-super-admin.repository.js';
import { PrismaTenantAdministradorRepository } from './infrastructure/persistence/prisma-tenant-administrador.repository.js';
import { AesGcmEncryptionService } from './infrastructure/gateways/aes-gcm-encryption.service.js';
import { ScryptHasherSenha } from './infrastructure/gateways/scrypt-hasher-senha.js';
import { PrismaValidadorConexao } from './infrastructure/gateways/prisma-validador-conexao.js';
import { PrismaProvisionadorSchema } from './infrastructure/gateways/prisma-provisionador-schema.js';
import { TenantResolverControlPlane } from './infrastructure/runtime/tenant-resolver.control-plane.js';
import { adminRoutes } from './infrastructure/http/admin.routes.js';

export interface OperisControlOptions {
  /** Chave mestra AES-256-GCM (32 bytes base64) — vem exclusivamente do ambiente. */
  chaveMestraCriptografia: string;
}

/**
 * Composition root do Control Plane (módulo de administração da plataforma).
 * Nenhum módulo de negócio importa nada daqui — a fronteira é garantida pelo
 * dependency-cruiser.
 */
export function construirModuloOperisControl(
  prisma: PrismaClient,
  ids: GeradorId,
  opcoes: OperisControlOptions,
) {
  const tenants = new PrismaTenantRepository(prisma);
  const superAdmins = new PrismaSuperAdminRepository(prisma);
  const administradores = new PrismaTenantAdministradorRepository(prisma);
  const rabbitmqConfigs = new PrismaConfiguracaoRabbitMqTenantRepository(prisma);
  const smtpConfigs = new PrismaConfiguracaoSmtpTenantRepository(prisma);

  const encryption = new AesGcmEncryptionService(opcoes.chaveMestraCriptografia);
  const hasher = new ScryptHasherSenha();
  const validadorConexao = new PrismaValidadorConexao();
  const provisionador = new PrismaProvisionadorSchema();

  // Resolver do Connection Manager: sabe traduzir tenantId → conexão (senha
  // decifrada). Exposto para o composition root montar o ConnectionManager.
  const tenantResolver = new TenantResolverControlPlane(tenants, encryption);

  return {
    tenantResolver,
    routes: adminRoutes({
      autenticarSuperAdminUseCase: new AutenticarSuperAdminUseCase(superAdmins, hasher),
      autenticarTenantAdministrador: new AutenticarTenantAdministradorUseCase(
        administradores,
        tenants,
        hasher,
      ),
      criarSuperAdmin: new CriarSuperAdminUseCase(superAdmins, hasher, ids),
      criarTenant: new CriarTenantUseCase(
        tenants,
        administradores,
        encryption,
        hasher,
        validadorConexao,
        provisionador,
        ids,
      ),
      listarTenants: new ListarTenantsUseCase(tenants),
      testarConexaoTenant: new TestarConexaoTenantUseCase(tenants, encryption, validadorConexao),
      configurarRabbitMqTenant: new ConfigurarRabbitMqTenantUseCase(
        rabbitmqConfigs,
        tenants,
        encryption,
        ids,
      ),
      obterRabbitMqTenant: new ObterRabbitMqTenantUseCase(rabbitmqConfigs),
      configurarSmtpTenant: new ConfigurarSmtpTenantUseCase(smtpConfigs, tenants, encryption, ids),
      obterSmtpTenant: new ObterSmtpTenantUseCase(smtpConfigs),
    }),
  };
}
