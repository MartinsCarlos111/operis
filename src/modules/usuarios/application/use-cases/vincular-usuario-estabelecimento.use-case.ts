import { UsuarioEstabelecimento } from '../../domain/entities/usuario-estabelecimento.js';
import { UsuarioNaoEncontradoError } from '../../domain/exceptions/usuario-nao-encontrado.error.js';
import { VinculoJaExisteError } from '../../domain/exceptions/vinculo-ja-existe.error.js';
import { NivelInvalidoParaEstabelecimentoError } from '../../domain/exceptions/nivel-invalido-para-estabelecimento.error.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';
import type { UsuarioEstabelecimentoRepository } from '../../domain/repositories/usuario-estabelecimento.repository.js';
import type { VerificadorNivelAcesso } from '../../domain/gateways/verificador-nivel-acesso.js';
import { paraVinculoDTO, type VinculoDTO } from '../dtos/vinculo.dto.js';

export interface VincularUsuarioEstabelecimentoInput {
  usuarioId: string;
  estabelecimentoId: string;
  nivelAcessoId: string;
}

/**
 * Vincula um usuário a um estabelecimento com um nível de acesso. Regras:
 * - o usuário precisa existir;
 * - não pode haver vínculo prévio (um nível por estabelecimento);
 * - o nível precisa pertencer ao estabelecimento (validado via porta
 *   anticorrupção, sem importar internals do contexto de estabelecimentos).
 */
export class VincularUsuarioEstabelecimentoUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly vinculos: UsuarioEstabelecimentoRepository,
    private readonly verificadorNivel: VerificadorNivelAcesso,
  ) {}

  async executar(input: VincularUsuarioEstabelecimentoInput): Promise<VinculoDTO> {
    const usuario = await this.usuarios.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw new UsuarioNaoEncontradoError(input.usuarioId);
    }

    const existente = await this.vinculos.buscar(input.usuarioId, input.estabelecimentoId);
    if (existente) {
      throw new VinculoJaExisteError(input.usuarioId, input.estabelecimentoId);
    }

    const nivelValido = await this.verificadorNivel.pertenceAoEstabelecimento(
      input.nivelAcessoId,
      input.estabelecimentoId,
    );
    if (!nivelValido) {
      throw new NivelInvalidoParaEstabelecimentoError(
        input.nivelAcessoId,
        input.estabelecimentoId,
      );
    }

    const vinculo = UsuarioEstabelecimento.criar(input);
    await this.vinculos.salvar(vinculo);
    return paraVinculoDTO(vinculo);
  }
}
