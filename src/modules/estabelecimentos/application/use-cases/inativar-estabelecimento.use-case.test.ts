import { describe, it, expect, beforeEach } from 'vitest';
import { InativarEstabelecimentoUseCase } from './inativar-estabelecimento.use-case.js';
import { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';
import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { StatusRecurso } from '@shared/domain/status-recurso.js';

class EstabelecimentoRepositoryEmMemoria implements EstabelecimentoRepository {
  private porId = new Map<string, Estabelecimento>();
  gravacoes = 0;

  async buscarPorId(id: string): Promise<Estabelecimento | null> {
    return this.porId.get(id) ?? null;
  }

  async listar(): Promise<Estabelecimento[]> {
    return [...this.porId.values()];
  }

  async salvar(estabelecimento: Estabelecimento): Promise<void> {
    this.gravacoes += 1;
    this.porId.set(estabelecimento.idEstabelecimento, estabelecimento);
  }

  /** Insere sem contar como gravação do use-case. */
  semear(estabelecimento: Estabelecimento): void {
    this.porId.set(estabelecimento.idEstabelecimento, estabelecimento);
  }
}

const ID = '11111111-1111-4111-8111-111111111111';

describe('InativarEstabelecimentoUseCase', () => {
  let repo: EstabelecimentoRepositoryEmMemoria;
  let useCase: InativarEstabelecimentoUseCase;

  beforeEach(() => {
    repo = new EstabelecimentoRepositoryEmMemoria();
    useCase = new InativarEstabelecimentoUseCase(repo);
    repo.semear(Estabelecimento.criar({ idEstabelecimento: ID, descricao: 'Matriz' }));
  });

  it('lança 404 quando o estabelecimento não existe', async () => {
    await expect(
      useCase.executar('22222222-2222-4222-8222-222222222222'),
    ).rejects.toBeInstanceOf(EstabelecimentoNaoEncontradoError);
  });

  it('inativa um estabelecimento ativo, sem apagar o registro', async () => {
    await useCase.executar(ID);

    const depois = await repo.buscarPorId(ID);
    expect(depois).not.toBeNull();
    expect(depois!.status).toBe(StatusRecurso.INATIVO);
    expect(depois!.descricao).toBe('Matriz');
  });

  it('é idempotente: inativar de novo não erra nem regrava', async () => {
    await useCase.executar(ID);
    const gravacoesAposPrimeira = repo.gravacoes;

    await expect(useCase.executar(ID)).resolves.toBeUndefined();

    expect(repo.gravacoes).toBe(gravacoesAposPrimeira);
    const depois = await repo.buscarPorId(ID);
    expect(depois!.status).toBe(StatusRecurso.INATIVO);
  });
});
