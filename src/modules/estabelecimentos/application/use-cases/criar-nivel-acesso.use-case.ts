import { NivelAcesso } from '../../domain/entities/nivel-acesso.js';
import { NomeNivelJaExisteError } from '../../domain/exceptions/nome-nivel-ja-existe.error.js';
import { PermissaoDesconhecidaError } from '../../domain/exceptions/permissao-desconhecida.error.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';
import type { NivelAcessoRepository } from '../../domain/repositories/nivel-acesso.repository.js';
import type { PermissaoRepository } from '../../domain/repositories/permissao.repository.js';
import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { paraNivelAcessoDTO, type NivelAcessoDTO } from '../dtos/nivel-acesso.dto.js';

export interface CriarNivelAcessoInput {
  estabelecimentoId: string;
  nome: string;
  descricao?: string | undefined;
  /** Ids de permissões do catálogo que este nível disponibiliza. */
  permissaoIds?: string[] | undefined;
}

/**
 * Cria um perfil de acesso do estabelecimento. Regras:
 * - o estabelecimento precisa existir;
 * - o nome é único dentro do estabelecimento;
 * - toda permissão selecionada precisa existir no catálogo.
 */
export class CriarNivelAcessoUseCase {
  constructor(
    private readonly niveis: NivelAcessoRepository,
    private readonly permissoes: PermissaoRepository,
    private readonly estabelecimentos: EstabelecimentoRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarNivelAcessoInput): Promise<NivelAcessoDTO> {
    const estabelecimento = await this.estabelecimentos.buscarPorId(input.estabelecimentoId);
    if (!estabelecimento) {
      throw new EstabelecimentoNaoEncontradoError(input.estabelecimentoId);
    }

    const nomeExistente = await this.niveis.buscarPorNome(input.estabelecimentoId, input.nome.trim());
    if (nomeExistente) {
      throw new NomeNivelJaExisteError(input.nome.trim());
    }

    const permissaoIds = input.permissaoIds ?? [];
    if (permissaoIds.length > 0) {
      const encontradas = await this.permissoes.buscarPorIds(permissaoIds);
      const idsEncontrados = new Set(encontradas.map((p) => p.idPermissao));
      const desconhecidas = permissaoIds.filter((id) => !idsEncontrados.has(id));
      if (desconhecidas.length > 0) {
        throw new PermissaoDesconhecidaError(desconhecidas);
      }
    }

    const nivel = NivelAcesso.criar({
      idNivelAcesso: this.ids.gerar(),
      nome: input.nome,
      descricao: input.descricao,
      estabelecimentoId: input.estabelecimentoId,
      permissaoIds,
    });

    await this.niveis.salvar(nivel);
    return paraNivelAcessoDTO(nivel);
  }
}
