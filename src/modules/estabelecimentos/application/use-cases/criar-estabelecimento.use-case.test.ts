import { describe, expect, it } from 'vitest';
import { CriarEstabelecimentoUseCase } from './criar-estabelecimento.use-case.js';
import type { CriadorEstabelecimentoComAcesso } from '../../domain/gateways/criador-estabelecimento-com-acesso.js';
import type { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';

class CriadorComAcessoFake implements CriadorEstabelecimentoComAcesso {
  chamadas: { estabelecimento: Estabelecimento; usuarioId: string }[] = [];

  async criar(estabelecimento: Estabelecimento, usuarioId: string): Promise<void> {
    this.chamadas.push({ estabelecimento, usuarioId });
  }
}

class GeradorIdFixo implements GeradorId {
  gerar(): string {
    return '0f1e2d3c-4b5a-6978-90ab-cdef12345678';
  }
}

describe('CriarEstabelecimentoUseCase', () => {
  it('cria o estabelecimento com o acesso inicial do usuario autenticado', async () => {
    const criador = new CriadorComAcessoFake();
    const useCase = new CriarEstabelecimentoUseCase(criador, new GeradorIdFixo());

    const resultado = await useCase.executar({
      usuarioId: '12345678-90ab-cdef-1234-567890abcdef',
      descricao: 'Matriz',
    });

    expect(resultado.idEstabelecimento).toBe('0f1e2d3c-4b5a-6978-90ab-cdef12345678');
    expect(criador.chamadas).toHaveLength(1);
    expect(criador.chamadas[0]).toMatchObject({
      usuarioId: '12345678-90ab-cdef-1234-567890abcdef',
      estabelecimento: { descricao: 'Matriz' },
    });
  });
});
