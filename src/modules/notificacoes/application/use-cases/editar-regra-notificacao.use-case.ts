import type { RegraNotificacaoRepository } from '../../domain/repositories/regra-notificacao.repository.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import { RegraNotificacaoNaoEncontradaError } from '../../domain/exceptions/regra-notificacao-nao-encontrada.error.js';
import { CodigoRegraJaExisteError } from '../../domain/exceptions/codigo-regra-ja-existe.error.js';
import { paraRegraNotificacaoDTO, type RegraNotificacaoDTO } from '../dtos/regra-notificacao.dto.js';

export interface EditarRegraNotificacaoInput {
  idRegraNotificacao: string;
  codigo: string;
  descricao: string;
  tabela: string;
  conteudo: string;
  destinatarios?: string | undefined;
  produto?: string | undefined;
  status?: StatusRecurso | undefined;
}

/**
 * Edita uma Regra de Notificação. Preserva RegraNotificacaoRN.Editar + Validar:
 *   1. campos obrigatórios  (entidade)
 *   2. regra existe
 *   3. se o código mudou, o novo não pode colidir
 */
export class EditarRegraNotificacaoUseCase {
  constructor(private readonly regras: RegraNotificacaoRepository) {}

  async executar(input: EditarRegraNotificacaoInput): Promise<RegraNotificacaoDTO> {
    const regra = await this.regras.buscarPorId(input.idRegraNotificacao);
    if (!regra) {
      throw new RegraNotificacaoNaoEncontradaError(input.idRegraNotificacao);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== regra.codigo) {
      const colisao = await this.regras.buscarPorCodigo(novoCodigo);
      if (colisao) {
        throw new CodigoRegraJaExisteError(novoCodigo);
      }
    }

    regra.alterar({
      codigo: input.codigo,
      descricao: input.descricao,
      tabela: input.tabela,
      conteudo: input.conteudo,
      destinatarios: input.destinatarios,
      produto: input.produto,
      status: input.status,
    });
    await this.regras.salvar(regra);
    return paraRegraNotificacaoDTO(regra);
  }
}
