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
import { MonitorarBrokerTenantUseCase } from './application/use-cases/monitorar-broker-tenant.use-case.js';
import { RabbitMqManagementMonitor } from './infrastructure/gateways/rabbitmq-management-monitor.js';
import { ConfigurarSmtpTenantUseCase } from './application/use-cases/configurar-smtp-tenant.use-case.js';
import { ObterSmtpTenantUseCase } from './application/use-cases/obter-smtp-tenant.use-case.js';
import { ConfigurarMinioTenantUseCase } from './application/use-cases/configurar-minio-tenant.use-case.js';
import { ObterMinioTenantUseCase } from './application/use-cases/obter-minio-tenant.use-case.js';
import { PrismaTenantRepository } from './infrastructure/persistence/prisma-tenant.repository.js';
import { PrismaConfiguracaoRabbitMqTenantRepository } from './infrastructure/persistence/prisma-configuracao-rabbitmq-tenant.repository.js';
import { PrismaConfiguracaoSmtpTenantRepository } from './infrastructure/persistence/prisma-configuracao-smtp-tenant.repository.js';
import { PrismaConfiguracaoMinioTenantRepository } from './infrastructure/persistence/prisma-configuracao-minio-tenant.repository.js';
import { PrismaSuperAdminRepository } from './infrastructure/persistence/prisma-super-admin.repository.js';
import { PrismaTenantAdministradorRepository } from './infrastructure/persistence/prisma-tenant-administrador.repository.js';
import { AesGcmEncryptionService } from './infrastructure/gateways/aes-gcm-encryption.service.js';
import { ScryptHasherSenha } from './infrastructure/gateways/scrypt-hasher-senha.js';
import { PrismaValidadorConexao } from './infrastructure/gateways/prisma-validador-conexao.js';
import { PrismaProvisionadorSchema } from './infrastructure/gateways/prisma-provisionador-schema.js';
import { PrismaInicializadorDadosTenant } from './infrastructure/gateways/prisma-inicializador-dados-tenant.js';
import { TenantResolverControlPlane } from './infrastructure/runtime/tenant-resolver.control-plane.js';
import { adminRoutes } from './infrastructure/http/admin.routes.js';

export interface OperisControlOptions {
  /** Chave mestra AES-256-GCM (32 bytes base64) — vem exclusivamente do ambiente. */
  chaveMestraCriptografia: string;
  /**
   * Porta da Management API dos brokers (padrão 15672). É independente da porta
   * AMQP guardada por tenant, que pode ter sido remapeada no deploy do broker.
   */
  portaManagementBroker?: number | undefined;
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
  const minioConfigs = new PrismaConfiguracaoMinioTenantRepository(prisma);

  const encryption = new AesGcmEncryptionService(opcoes.chaveMestraCriptografia);
  const hasher = new ScryptHasherSenha();
  const validadorConexao = new PrismaValidadorConexao();
  const provisionador = new PrismaProvisionadorSchema();
  const inicializadorDadosTenant = new PrismaInicializadorDadosTenant();
  const monitorBroker = new RabbitMqManagementMonitor(opcoes.portaManagementBroker);

  // Resolver do Connection Manager: sabe traduzir tenantId → conexão (senha
  // decifrada). Exposto para o composition root montar o ConnectionManager.
  const tenantResolver = new TenantResolverControlPlane(tenants, encryption);

  /**
   * Traduz tenantId → acesso à Management API do broker (senha decifrada em
   * memória). Exposto para o composition root injetar no módulo iot, que
   * precisa do broker mas não pode importar o Control Plane.
   */
  const resolverAcessoBroker = async (tenantId: string) => {
    const config = await rabbitmqConfigs.buscarPorTenant(tenantId);
    if (!config) return null;
    return {
      host: config.host,
      porta: config.porta,
      portaManagement: opcoes.portaManagementBroker ?? 15672,
      usuario: config.usuario,
      senha: encryption.decifrar(config.senhaCifrada),
      virtualHost: config.virtualHost,
      sslHabilitado: config.sslHabilitado,
    };
  };

  /**
   * Traduz tenantId → acesso ao object storage MinIO (secret decifrado em
   * memória). Exposto para o composition root injetar no módulo iot (guarda
   * binários de firmware), que não pode importar o Control Plane.
   */
  const resolverAcessoObjectStorage = async (tenantId: string) => {
    const config = await minioConfigs.buscarPorTenant(tenantId);
    if (!config) return null;
    return {
      host: config.host,
      porta: config.porta,
      bucket: config.bucket,
      accessKey: config.accessKey,
      secretKey: encryption.decifrar(config.secretKeyCifrada),
      sslHabilitado: config.sslHabilitado,
      pathStyleAccess: config.pathStyleAccess,
    };
  };

  return {
    resolverAcessoBroker,
    resolverAcessoObjectStorage,
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
        inicializadorDadosTenant,
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
      monitorarBrokerTenant: new MonitorarBrokerTenantUseCase(
        rabbitmqConfigs,
        encryption,
        monitorBroker,
      ),
      configurarSmtpTenant: new ConfigurarSmtpTenantUseCase(smtpConfigs, tenants, encryption, ids),
      obterSmtpTenant: new ObterSmtpTenantUseCase(smtpConfigs),
      configurarMinioTenant: new ConfigurarMinioTenantUseCase(minioConfigs, tenants, encryption, ids),
      obterMinioTenant: new ObterMinioTenantUseCase(minioConfigs),
    }),
  };
}
