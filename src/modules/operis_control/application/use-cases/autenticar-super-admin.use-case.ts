import { Email } from '../../domain/value-objects/email.js';
import { CredenciaisInvalidasError } from '../../domain/exceptions/index.js';
import type { SuperAdminRepository } from '../../domain/repositories/super-admin.repository.js';
import type { HasherSenha } from '../../domain/gateways/hasher-senha.js';
import { paraSuperAdminDTO, type SuperAdminDTO } from '../dtos/super-admin.dto.js';

export interface AutenticarSuperAdminInput {
  email: string;
  senha: string;
}

/**
 * Autenticação ISOLADA do super-admin (painel interno). Mesma mensagem de erro
 * para email inexistente e senha errada — não vaza quais emails existem.
 * Quem assina o JWT é a rota (infra); aqui só se valida a identidade.
 */
export class AutenticarSuperAdminUseCase {
  constructor(
    private readonly superAdmins: SuperAdminRepository,
    private readonly hasher: HasherSenha,
  ) {}

  async executar(input: AutenticarSuperAdminInput): Promise<SuperAdminDTO> {
    let email: Email;
    try {
      email = Email.criar(input.email);
    } catch {
      throw new CredenciaisInvalidasError();
    }

    const superAdmin = await this.superAdmins.buscarPorEmail(email);
    if (!superAdmin || !superAdmin.estaAtivo()) {
      throw new CredenciaisInvalidasError();
    }

    const senhaConfere = await this.hasher.verificar(input.senha, superAdmin.senhaHash);
    if (!senhaConfere) {
      throw new CredenciaisInvalidasError();
    }

    return paraSuperAdminDTO(superAdmin);
  }
}
