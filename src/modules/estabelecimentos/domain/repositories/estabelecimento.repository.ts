import type { Estabelecimento } from '../entities/estabelecimento.js';

/**
 * Porta. A camada de aplicação conversa com esta interface; a infraestrutura
 * fornece o adaptador Prisma. O domínio é dono do contrato.
 */
export interface EstabelecimentoRepository {
  buscarPorId(id: string): Promise<Estabelecimento | null>;
  /** Todos os estabelecimentos do banco do tenant (mais recentes primeiro). */
  listar(): Promise<Estabelecimento[]>;
  salvar(estabelecimento: Estabelecimento): Promise<void>;
}
