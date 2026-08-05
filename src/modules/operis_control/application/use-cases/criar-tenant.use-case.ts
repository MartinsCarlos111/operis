import { Tenant } from '../../domain/entities/tenant.js';
import { ConfiguracaoBancoTenant } from '../../domain/entities/configuracao-banco-tenant.js';
import { TenantAdministrador } from '../../domain/entities/tenant-administrador.js';
import { Slug } from '../../domain/value-objects/slug.js';
import { Email } from '../../domain/value-objects/email.js';
import { SlugJaExisteError, EmailJaEmUsoError } from '../../domain/exceptions/index.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { TenantAdministradorRepository } from '../../domain/repositories/tenant-administrador.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';
import type { HasherSenha } from '../../domain/gateways/hasher-senha.js';
import type { ValidadorConexaoBanco, DadosConexaoBanco } from '../../domain/gateways/validador-conexao-banco.js';
import type { ProvisionadorSchemaTenant } from '../../domain/gateways/provisionador-schema-tenant.js';
import type { InicializadorDadosTenant } from '../../domain/gateways/inicializador-dados-tenant.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { paraTenantDTO, type TenantDTO } from '../dtos/tenant.dto.js';
import { paraTenantAdministradorDTO, type TenantAdministradorDTO } from '../dtos/tenant-administrador.dto.js';

export interface CriarTenantInput {
  nome: string;
  slug: string;
  banco: {
    host: string;
    porta: number;
    nomeBanco: string;
    usuario: string;
    /** Texto puro — só existe em memória até a cifragem, nunca é persistido assim. */
    senha: string;
    sslHabilitado?: boolean | undefined;
  };
  administrador: {
    nome: string;
    email: string;
    senha: string;
  };
  /** Aplica o schema no banco do tenant (migrations). Default: true. */
  provisionarSchema?: boolean | undefined;
}

export interface CriarTenantOutput {
  tenant: TenantDTO;
  administrador: TenantAdministradorDTO;
}

/**
 * Fluxo de provisionamento da especificação, na ordem:
 *   1. super-admin informa dados do tenant + conexão + admin;
 *   2. valida a conexão com o banco informado;
 *   3. cifra a senha (AES-256-GCM) — nunca persistida em texto puro;
 *   4. salva tenant + configuração de banco (mesmo agregado);
 *   5. executa migrations no banco dedicado;
 *   6. cria o administrador do tenant (hash de senha, no Control Plane);
 *   7. tenant disponível (conexão ONLINE).
 */
export class CriarTenantUseCase {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly administradores: TenantAdministradorRepository,
    private readonly encryption: EncryptionService,
    private readonly hasher: HasherSenha,
    private readonly validadorConexao: ValidadorConexaoBanco,
    private readonly provisionador: ProvisionadorSchemaTenant,
    private readonly inicializadorDadosTenant: InicializadorDadosTenant,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarTenantInput): Promise<CriarTenantOutput> {
    const slug = Slug.criar(input.slug);
    const emailAdmin = Email.criar(input.administrador.email);

    const slugExistente = await this.tenants.buscarPorSlug(slug);
    if (slugExistente) {
      throw new SlugJaExisteError(slug.valor);
    }
    const emailExistente = await this.administradores.buscarPorEmail(emailAdmin);
    if (emailExistente) {
      throw new EmailJaEmUsoError(emailAdmin.valor);
    }

    // 2. Validar conexão ANTES de qualquer persistência.
    const dadosConexao: DadosConexaoBanco = {
      host: input.banco.host,
      porta: input.banco.porta,
      nomeBanco: input.banco.nomeBanco,
      usuario: input.banco.usuario,
      senha: input.banco.senha,
      sslHabilitado: input.banco.sslHabilitado ?? true,
    };
    await this.validadorConexao.validar(dadosConexao);

    // 3. Cifrar a senha do banco.
    const senhaCifrada = this.encryption.cifrar(input.banco.senha);

    // 4. Montar o agregado e reservar o mesmo id para a identidade do Data Plane.
    const tenant = Tenant.criar({ idTenant: this.ids.gerar(), nome: input.nome, slug });
    const idAdministrador = this.ids.gerar();
    const banco = ConfiguracaoBancoTenant.criar({
      idTenantDatabase: this.ids.gerar(),
      host: dadosConexao.host,
      porta: dadosConexao.porta,
      nomeBanco: dadosConexao.nomeBanco,
      usuario: dadosConexao.usuario,
      senhaCifrada,
      sslHabilitado: dadosConexao.sslHabilitado,
    });
    tenant.definirBanco(banco);

    // 5. Executar migrations no banco dedicado.
    if (input.provisionarSchema ?? true) {
      await this.provisionador.provisionar(dadosConexao);
    }

    // 6. O JWT do administrador usa este mesmo id como `sub`. Por isso a
    // identidade correspondente precisa existir no banco do tenant antes do
    // primeiro estabelecimento ser criado.
    await this.inicializadorDadosTenant.inicializar(dadosConexao, {
      idUsuario: idAdministrador,
      nome: input.administrador.nome,
      email: emailAdmin.valor,
    });

    banco.registrarConexaoBemSucedida();
    await this.tenants.salvar(tenant);

    // 7. Criar o administrador do tenant (login vive no Control Plane).
    const administrador = TenantAdministrador.criar({
      idTenantAdministrador: idAdministrador,
      tenantId: tenant.idTenant,
      nome: input.administrador.nome,
      email: emailAdmin,
      senhaHash: await this.hasher.gerarHash(input.administrador.senha),
    });
    await this.administradores.salvar(administrador);

    return {
      tenant: paraTenantDTO(tenant),
      administrador: paraTenantAdministradorDTO(administrador),
    };
  }
}
