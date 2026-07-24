import { SuperAdmin } from '../../domain/entities/super-admin.js';
import { Email } from '../../domain/value-objects/email.js';
import { EmailJaEmUsoError } from '../../domain/exceptions/index.js';
import type { SuperAdminRepository } from '../../domain/repositories/super-admin.repository.js';
import type { HasherSenha } from '../../domain/gateways/hasher-senha.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { paraSuperAdminDTO, type SuperAdminDTO } from '../dtos/super-admin.dto.js';

export interface CriarSuperAdminInput {
  nome: string;
  email: string;
  senha: string;
}

/** Só um super-admin autenticado cria outro (o primeiro nasce via seed). */
export class CriarSuperAdminUseCase {
  constructor(
    private readonly superAdmins: SuperAdminRepository,
    private readonly hasher: HasherSenha,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarSuperAdminInput): Promise<SuperAdminDTO> {
    const email = Email.criar(input.email);

    const existente = await this.superAdmins.buscarPorEmail(email);
    if (existente) {
      throw new EmailJaEmUsoError(email.valor);
    }
    if (input.senha.length < 8) {
      throw new Error('A senha deve ter ao menos 8 caracteres');
    }

    const superAdmin = SuperAdmin.criar({
      idSuperAdmin: this.ids.gerar(),
      nome: input.nome,
      email,
      senhaHash: await this.hasher.gerarHash(input.senha),
    });

    await this.superAdmins.salvar(superAdmin);
    return paraSuperAdminDTO(superAdmin);
  }
}
