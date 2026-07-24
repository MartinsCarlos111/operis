import type { Estabelecimento } from '../entities/estabelecimento.js';

/**
 * Porta. A camada de aplicação conversa com esta interface; a infraestrutura
 * fornece o adaptador Prisma. O domínio é dono do contrato.
 */
export interface EstabelecimentoRepository {
  buscarPorId(id: string): Promise<Estabelecimento | null>;
  salvar(estabelecimento: Estabelecimento): Promise<void>;
}
