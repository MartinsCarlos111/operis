import type { Impressora } from '../entities/impressora.js';

/**
 * Critério de listagem paginada (paridade com ImpressoraDAO:
 * startRowIndex/maximumRows/filterExpression). Impressora é global do tenant —
 * não há escopo por estabelecimento aqui. O filtro por string do legado vira
 * um `termo` tipado, traduzido para Prisma.where na infraestrutura.
 */
export interface CriterioListagemImpressora {
  startIndex: number;
  maxRows: number;
  /** Busca textual opcional sobre código/descrição/endereço. */
  termo?: string | undefined;
}

/** Port do agregado Impressora. Implementado por PrismaImpressoraRepository. */
export interface ImpressoraRepository {
  buscarPorId(idImpressora: string): Promise<Impressora | null>;
  /** Resolve unicidade de código no tenant (regra do ImpressoraRN). */
  buscarPorCodigo(codigo: string): Promise<Impressora | null>;
  listar(criterio: CriterioListagemImpressora): Promise<Impressora[]>;
  contar(termo?: string | undefined): Promise<number>;
  salvar(impressora: Impressora): Promise<void>;
  excluir(idImpressora: string): Promise<void>;
}
