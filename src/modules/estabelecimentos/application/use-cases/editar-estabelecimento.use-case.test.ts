import { describe, it, expect, beforeEach } from 'vitest';
import { EditarEstabelecimentoUseCase } from './editar-estabelecimento.use-case.js';
import { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import { EstabelecimentoNaoEncontradoError } from '../../domain/exceptions/estabelecimento-nao-encontrado.error.js';
import type { EstabelecimentoRepository } from '../../domain/repositories/estabelecimento.repository.js';
import { StatusRecurso } from '@shared/domain/status-recurso.js';

class EstabelecimentoRepositoryEmMemoria implements EstabelecimentoRepository {
  private porId = new Map<string, Estabelecimento>();
  /** Quantas vezes salvar() foi chamado — usado para provar idempotência. */
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
}

const ID = '11111111-1111-4111-8111-111111111111';

describe('EditarEstabelecimentoUseCase', () => {
  let repo: EstabelecimentoRepositoryEmMemoria;
  let useCase: EditarEstabelecimentoUseCase;

  beforeEach(async () => {
    repo = new EstabelecimentoRepositoryEmMemoria();
    useCase = new EditarEstabelecimentoUseCase(repo);
    await repo.salvar(
      Estabelecimento.criar({
        idEstabelecimento: ID,
        descricao: 'Matriz',
        recursos: { impressoras: StatusRecurso.ATIVO, manufatura: StatusRecurso.ATIVO },
      }),
    );
  });

  it('lança 404 quando o estabelecimento não existe', async () => {
    await expect(
      useCase.executar({
        idEstabelecimento: '22222222-2222-4222-8222-222222222222',
        descricao: 'Filial',
      }),
    ).rejects.toBeInstanceOf(EstabelecimentoNaoEncontradoError);
  });

  it('altera a descrição preservando o id e a data de criação', async () => {
    const original = await repo.buscarPorId(ID);
    const criadoEm = original!.criadoEm;

    const dto = await useCase.executar({ idEstabelecimento: ID, descricao: '  Matriz SP  ' });

    expect(dto.idEstabelecimento).toBe(ID);
    expect(dto.descricao).toBe('Matriz SP'); // trim aplicado pela entidade
    expect(dto.criadoEm).toBe(criadoEm.toISOString());
  });

  it('substitui o conjunto de recursos: módulo omitido é desligado', async () => {
    // Só `coletores` vai no input — impressoras e manufatura estavam ATIVO.
    const dto = await useCase.executar({
      idEstabelecimento: ID,
      descricao: 'Matriz',
      recursos: { coletores: StatusRecurso.ATIVO },
    });

    expect(dto.recursos).toEqual({
      impressoras: StatusRecurso.INATIVO,
      coletores: StatusRecurso.ATIVO,
      checklist: StatusRecurso.INATIVO,
      manufatura: StatusRecurso.INATIVO,
    });
  });

  it('preserva o status quando o campo é omitido', async () => {
    const dto = await useCase.executar({ idEstabelecimento: ID, descricao: 'Matriz' });
    expect(dto.status).toBe(StatusRecurso.ATIVO);
  });

  it('inativa quando recebe status INATIVO', async () => {
    const dto = await useCase.executar({
      idEstabelecimento: ID,
      descricao: 'Matriz',
      status: StatusRecurso.INATIVO,
    });
    expect(dto.status).toBe(StatusRecurso.INATIVO);
  });

  it('reativa um estabelecimento inativo quando recebe status ATIVO', async () => {
    await useCase.executar({
      idEstabelecimento: ID,
      descricao: 'Matriz',
      status: StatusRecurso.INATIVO,
    });

    const dto = await useCase.executar({
      idEstabelecimento: ID,
      descricao: 'Matriz',
      status: StatusRecurso.ATIVO,
    });

    expect(dto.status).toBe(StatusRecurso.ATIVO);
  });

  it('rejeita descrição com menos de 2 caracteres, sem gravar', async () => {
    const gravacoesAntes = repo.gravacoes;

    await expect(
      useCase.executar({ idEstabelecimento: ID, descricao: ' M ' }),
    ).rejects.toThrow(/ao menos 2 caracteres/);

    expect(repo.gravacoes).toBe(gravacoesAntes);
  });
});
