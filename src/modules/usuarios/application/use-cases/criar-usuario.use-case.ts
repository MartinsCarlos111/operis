import { Usuario } from '../../domain/entities/usuario.js';
import { Email } from '../../domain/value-objects/email.js';
import { PoliticasLogin, type PoliticasLoginProps } from '../../domain/value-objects/politicas-login.js';
import { EmailJaEmUsoError } from '../../domain/exceptions/email-ja-em-uso.error.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { paraUsuarioDTO, type UsuarioDTO } from '../dtos/usuario.dto.js';

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  biometria?: boolean | undefined;
  politicasLogin?: PoliticasLoginProps | undefined;
}

/**
 * Cria a identidade do usuário. O acesso a estabelecimentos é um passo
 * separado (VincularUsuarioEstabelecimento) — identidade e autorização são
 * conceitos distintos no domínio.
 */
export class CriarUsuarioUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarUsuarioInput): Promise<UsuarioDTO> {
    const email = Email.criar(input.email);

    const existente = await this.usuarios.buscarPorEmail(email);
    if (existente) {
      throw new EmailJaEmUsoError(email.valor);
    }

    const usuario = Usuario.criar({
      idUsuario: this.ids.gerar(),
      nome: input.nome,
      email,
      biometria: input.biometria,
      politicasLogin: input.politicasLogin
        ? PoliticasLogin.criar(input.politicasLogin)
        : undefined,
    });

    await this.usuarios.salvar(usuario);
    return paraUsuarioDTO(usuario);
  }
}
