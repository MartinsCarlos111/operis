import { RegraNotificacao } from '../../domain/entities/regra-notificacao.js';
import type { RegraNotificacaoRepository } from '../../domain/repositories/regra-notificacao.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import { CodigoRegraJaExisteError } from '../../domain/exceptions/codigo-regra-ja-existe.error.js';
import { paraRegraNotificacaoDTO, type RegraNotificacaoDTO } from '../dtos/regra-notificacao.dto.js';

export interface CriarRegraNotificacaoInput {
  codigo: string;
  descricao: string;
  tabela: string;
  conteudo: string;
  destinatarios?: string | undefined;
  produto?: string | undefined;
  status?: StatusRecurso | undefined;
}

/**
 * Cria uma Regra de Notificação. Preserva RegraNotificacaoRN.Adicionar + Validar:
 *   1. código/descrição/tabela/conteúdo obrigatórios  (entidade)
 *   2. código único no tenant
 */
export class CriarRegraNotificacaoUseCase {
  constructor(
    private readonly regras: RegraNotificacaoRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: CriarRegraNotificacaoInput): Promise<RegraNotificacaoDTO> {
    const regra = RegraNotificacao.criar({
      idRegraNotificacao: this.ids.gerar(),
      codigo: input.codigo,
      descricao: input.descricao,
      tabela: input.tabela,
      conteudo: input.conteudo,
      destinatarios: input.destinatarios,
      produto: input.produto,
      status: input.status,
    });

    const existente = await this.regras.buscarPorCodigo(regra.codigo);
    if (existente) {
      throw new CodigoRegraJaExisteError(regra.codigo);
    }

    await this.regras.salvar(regra);
    return paraRegraNotificacaoDTO(regra);
  }
}
