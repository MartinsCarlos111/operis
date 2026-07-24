import { Email } from '../../domain/value-objects/email.js';
import { CredenciaisInvalidasError } from '../../domain/exceptions/index.js';
import type { TenantAdministradorRepository } from '../../domain/repositories/tenant-administrador.repository.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { HasherSenha } from '../../domain/gateways/hasher-senha.js';
import {
  paraTenantAdministradorDTO,
  type TenantAdministradorDTO,
} from '../dtos/tenant-administrador.dto.js';

export interface AutenticarTenantAdministradorInput {
  email: string;
  senha: string;
}

/**
 * Login do administrador de um tenant (cliente). O email é o índice: descobre
 * o tenant a partir dele — é por isso que este registro vive no Control Plane.
 * Regras: admin ativo E tenant ativo. Erros indistinguíveis entre "email não
 * existe", "senha errada" e "tenant inativo" (não vaza a existência do tenant).
 */
export class AutenticarTenantAdministradorUseCase {
  constructor(
    private readonly administradores: TenantAdministradorRepository,
    private readonly tenants: TenantRepository,
    private readonly hasher: HasherSenha,
  ) {}

  async executar(input: AutenticarTenantAdministradorInput): Promise<TenantAdministradorDTO> {
    let email: Email;
    try {
      email = Email.criar(input.email);
    } catch {
      throw new CredenciaisInvalidasError();
    }

    const administrador = await this.administradores.buscarPorEmail(email);
    if (!administrador || !administrador.estaAtivo()) {
      throw new CredenciaisInvalidasError();
    }

    const tenant = await this.tenants.buscarPorId(administrador.tenantId);
    if (!tenant || !tenant.estaAtivo()) {
      throw new CredenciaisInvalidasError();
    }

    const senhaConfere = await this.hasher.verificar(input.senha, administrador.senhaHash);
    if (!senhaConfere) {
      throw new CredenciaisInvalidasError();
    }

    return paraTenantAdministradorDTO(administrador);
  }
}
