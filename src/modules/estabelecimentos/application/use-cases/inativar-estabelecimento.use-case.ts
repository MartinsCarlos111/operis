import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';

/**
 * Inativa um estabelecimento (soft delete). É a ação de "remover" do cadastro:
 * exclusão física não é oferecida porque as relações do schema são
 * `onDelete: Cascade` — apagar a linha levaria junto áreas, vínculos de
 * usuário, impressoras e dispositivos IoT. Inativar preserva o histórico e é
 * reversível pela edição (status → ATIVO).
 *
 * Idempotente: inativar o que já está inativo não é erro.
 */
export class InativarEstabelecimentoUseCase {
  constructor(private readonly estabelecimentos: EstabelecimentoRepository) {}

  async executar(idEstabelecimento: string): Promise<void> {
    const estabelecimento = await this.estabelecimentos.buscarPorId(idEstabelecimento);
    if (!estabelecimento) {
      throw new EstabelecimentoNaoEncontradoError(idEstabelecimento);
    }

    if (!estabelecimento.estaAtivo()) return;

    estabelecimento.inativar();
    await this.estabelecimentos.salvar(estabelecimento);
  }
}
