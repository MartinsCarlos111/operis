import type { Estabelecimento } from '../entities/estabelecimento.js';

/** Persiste o estabelecimento e o acesso inicial em uma unica transacao. */
export interface CriadorEstabelecimentoComAcesso {
  criar(estabelecimento: Estabelecimento, usuarioId: string): Promise<void>;
}
