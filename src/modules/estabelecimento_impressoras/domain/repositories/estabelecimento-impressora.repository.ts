import type { EstabelecimentoImpressora } from '../entities/estabelecimento-impressora.js';

/** Port do vínculo estabelecimento ↔ impressora. */
export interface EstabelecimentoImpressoraRepository {
  buscar(
    estabelecimentoId: string,
    impressoraId: string,
  ): Promise<EstabelecimentoImpressora | null>;
  listarPorEstabelecimento(estabelecimentoId: string): Promise<EstabelecimentoImpressora[]>;
  listarPorImpressora(impressoraId: string): Promise<EstabelecimentoImpressora[]>;
  salvar(vinculo: EstabelecimentoImpressora): Promise<void>;
  excluir(estabelecimentoId: string, impressoraId: string): Promise<void>;
}
