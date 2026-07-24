import { TenantNaoEncontradoError } from '../../domain/exceptions/index.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { EncryptionService } from '../../domain/gateways/encryption-service.js';
import type { ValidadorConexaoBanco } from '../../domain/gateways/validador-conexao-banco.js';
import { paraTenantDTO, type TenantDTO } from '../dtos/tenant.dto.js';

/**
 * Verifica a disponibilidade do banco de um tenant sob demanda e registra o
 * resultado operacional (statusConexao + lastConnectionAt). A senha é
 * decifrada apenas em memória, no instante do teste.
 */
export class TestarConexaoTenantUseCase {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly encryption: EncryptionService,
    private readonly validadorConexao: ValidadorConexaoBanco,
  ) {}

  async executar(tenantId: string): Promise<TenantDTO> {
    const tenant = await this.tenants.buscarPorId(tenantId);
    if (!tenant || !tenant.banco) {
      throw new TenantNaoEncontradoError(tenantId);
    }
    const banco = tenant.banco;

    try {
      await this.validadorConexao.validar({
        host: banco.host,
        porta: banco.porta,
        nomeBanco: banco.nomeBanco,
        usuario: banco.usuario,
        senha: this.encryption.decifrar(banco.senhaCifrada),
        sslHabilitado: banco.sslHabilitado,
      });
      banco.registrarConexaoBemSucedida();
    } catch (erro) {
      banco.registrarFalhaConexao();
      await this.tenants.salvar(tenant);
      throw erro;
    }

    await this.tenants.salvar(tenant);
    return paraTenantDTO(tenant);
  }
}
