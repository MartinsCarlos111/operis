import { describe, it, expect, beforeEach } from 'vitest';
import {
  CancelarReservaUseCase,
  CriarReservaUseCase,
  EditarReservaUseCase,
  type EntradaReserva,
} from './reserva.use-cases.js';
import { Reserva, StatusReserva } from '../../domain/entities/reserva.js';
import { OrdemProducao, type StatusOrdemProducao } from '../../domain/entities/ordem-producao.js';
import type {
  CriterioListagemReserva,
  ReservaRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type {
  CriterioOrdemProducao,
  OrdemProducaoRepository,
} from '../../domain/repositories/ordem-producao.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  OrdemProducaoBloqueiaReservaError,
  ReservaJaExisteError,
  ReservaNaoEncontradaError,
} from '../../domain/exceptions/manufatura.errors.js';
import { OrdemProducaoNaoEncontradaError } from '../../domain/exceptions/ordem-producao.errors.js';

const ESTAB = '11111111-1111-4111-8111-111111111111';
const ORDEM = '22222222-2222-4222-8222-222222222222';
const ID_RESERVA = '33333333-3333-4333-8333-333333333333';

class ReservasEmMemoria implements ReservaRepository {
  itens = new Map<string, Reserva>();
  gravacoes = 0;
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async buscarPorIdentidade(ordemProducaoId: string, itemCodigo: string, sequencia: number) {
    return (
      [...this.itens.values()].find(
        (r) =>
          r.ordemProducaoId === ordemProducaoId &&
          r.itemCodigo === itemCodigo &&
          r.sequencia === sequencia,
      ) ?? null
    );
  }
  async listar(_c: CriterioListagemReserva) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(r: Reserva) {
    this.gravacoes += 1;
    this.itens.set(r.idReserva, r);
  }
  semear(r: Reserva) {
    this.itens.set(r.idReserva, r);
  }
}

class OrdensEmMemoria implements OrdemProducaoRepository {
  itens = new Map<string, OrdemProducao>();
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async buscarPorIdentidade() {
    return null;
  }
  async listar(_c: CriterioOrdemProducao) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(o: OrdemProducao) {
    this.itens.set(o.dados.idOrdemProducao as string, o);
  }
  /** Registra uma ordem com o status desejado, sem passar pelas regras dela. */
  semear(id: string, status: StatusOrdemProducao): void {
    const ordem = {
      dados: { idOrdemProducao: id, estabelecimentoId: ESTAB, status },
    } as unknown as OrdemProducao;
    this.itens.set(id, ordem);
  }
}

const idsFixos = (valor: string): GeradorId => ({ gerar: () => valor });

const entradaValida: EntradaReserva = {
  estabelecimentoId: ESTAB,
  ordemProducaoId: ORDEM,
  sequencia: 1,
  itemCodigo: 'MP-001',
  itemDescricao: 'Chapa de aço',
  quantidadeReserva: 100,
};

describe('CriarReservaUseCase (ReservaRN.AdicionarReserva)', () => {
  let reservas: ReservasEmMemoria;
  let ordens: OrdensEmMemoria;
  let useCase: CriarReservaUseCase;

  beforeEach(() => {
    reservas = new ReservasEmMemoria();
    ordens = new OrdensEmMemoria();
    ordens.semear(ORDEM, 'LIBERADA');
    useCase = new CriarReservaUseCase(reservas, ordens, idsFixos(ID_RESERVA));
  });

  it('cria com status NAO_REQUISITADA quando nada foi requisitado', async () => {
    const dto = await useCase.executar(entradaValida);

    expect(dto.idReserva).toBe(ID_RESERVA);
    expect(dto.status).toBe(StatusReserva.NAO_REQUISITADA);
    expect(dto.quantidadeReserva).toBe(100);
    expect(dto.saldoRequisitado).toBe(0);
  });

  it('deriva REQUISITADA quando quantidadeRequisitada > 0', async () => {
    const dto = await useCase.executar({ ...entradaValida, quantidadeRequisitada: 40 });

    expect(dto.status).toBe(StatusReserva.REQUISITADA);
    expect(dto.saldoRequisitado).toBe(40);
  });

  it('desconta a devolução do saldo requisitado', async () => {
    const dto = await useCase.executar({
      ...entradaValida,
      quantidadeRequisitada: 40,
      quantidadeDevolvida: 15,
    });
    expect(dto.saldoRequisitado).toBe(25);
  });

  it('recusa item em branco — "Código do Item é inválido."', async () => {
    await expect(useCase.executar({ ...entradaValida, itemCodigo: ' ' })).rejects.toThrow(
      'Código do Item é inválido.',
    );
  });

  it('recusa descrição em branco — "Descrição do Item é inválida."', async () => {
    await expect(useCase.executar({ ...entradaValida, itemDescricao: '' })).rejects.toThrow(
      'Descrição do Item é inválida.',
    );
  });

  it('recusa sequência menor que 1, com o valor recebido na mensagem', async () => {
    await expect(useCase.executar({ ...entradaValida, sequencia: 0 })).rejects.toThrow(
      "A sequência da reserva não pode ser menor do que '1'. Valor recebido: '0'.",
    );
  });

  it('recusa quantidades negativas nas três colunas', async () => {
    await expect(
      useCase.executar({ ...entradaValida, quantidadeReserva: -1 }),
    ).rejects.toThrow("A quantidade da reserva não pode ser menor do que '0'. Valor recebido: '-1'.");

    await expect(
      useCase.executar({ ...entradaValida, quantidadeRequisitada: -2 }),
    ).rejects.toThrow(
      "A quantidade requisitada da reserva não pode ser menor do que '0'. Valor recebido: '-2'.",
    );

    await expect(
      useCase.executar({ ...entradaValida, quantidadeDevolvida: -3 }),
    ).rejects.toThrow(
      "A quantidade devolvida da reserva não pode ser menor do que '0'. Valor recebido: '-3'.",
    );
  });

  it('recusa ordem inexistente', async () => {
    await expect(
      useCase.executar({
        ...entradaValida,
        ordemProducaoId: '44444444-4444-4444-8444-444444444444',
      }),
    ).rejects.toBeInstanceOf(OrdemProducaoNaoEncontradaError);
  });

  it('recusa (ordem + item + sequência) duplicada', async () => {
    await useCase.executar(entradaValida);
    await expect(useCase.executar(entradaValida)).rejects.toBeInstanceOf(ReservaJaExisteError);
  });

  it('aceita a mesma sequência para outro item', async () => {
    await useCase.executar(entradaValida);
    const dto = await useCase.executar({ ...entradaValida, itemCodigo: 'MP-002' });
    expect(dto.itemCodigo).toBe('MP-002');
  });
});

describe('ValidarStatusOrdemReserva — status que bloqueiam', () => {
  const BLOQUEIAM: StatusOrdemProducao[] = [
    'BAIXADA',
    'CANCELADA',
    'CONCLUIDA',
    'RECUSADA',
    'INICIADA',
  ];
  const PERMITEM: StatusOrdemProducao[] = ['LIBERADA', 'NAO_LIBERADA', 'CONGELADA'];

  function montar(status: StatusOrdemProducao) {
    const reservas = new ReservasEmMemoria();
    const ordens = new OrdensEmMemoria();
    ordens.semear(ORDEM, status);
    return {
      reservas,
      useCase: new CriarReservaUseCase(reservas, ordens, idsFixos(ID_RESERVA)),
    };
  }

  it.each(BLOQUEIAM)('bloqueia quando a ordem está %s', async (status) => {
    const { useCase } = montar(status);
    await expect(useCase.executar(entradaValida)).rejects.toBeInstanceOf(
      OrdemProducaoBloqueiaReservaError,
    );
  });

  it.each(PERMITEM)('permite quando a ordem está %s', async (status) => {
    const { useCase } = montar(status);
    const dto = await useCase.executar(entradaValida);
    expect(dto.idReserva).toBe(ID_RESERVA);
  });

  it('BAIXADA vira "Baixada em um Centro de Trabalho" na mensagem', async () => {
    const { useCase } = montar('BAIXADA');
    await expect(useCase.executar(entradaValida)).rejects.toThrow(
      'A Ordem de Produção está Baixada em um Centro de Trabalho. Não será possível adicionar ou alterar suas reservas.',
    );
  });

  it('o terminal ignora o status da ordem', async () => {
    const { useCase } = montar('INICIADA');
    const dto = await useCase.executar({ ...entradaValida, origemTerminal: true });
    expect(dto.idReserva).toBe(ID_RESERVA);
  });

  it('não grava quando o status bloqueia', async () => {
    const { useCase, reservas } = montar('CONCLUIDA');
    await expect(useCase.executar(entradaValida)).rejects.toThrow();
    expect(reservas.gravacoes).toBe(0);
  });
});

describe('CancelarReservaUseCase (ReservaRN.CancelarReserva)', () => {
  let reservas: ReservasEmMemoria;
  let ordens: OrdensEmMemoria;
  let useCase: CancelarReservaUseCase;

  beforeEach(() => {
    reservas = new ReservasEmMemoria();
    ordens = new OrdensEmMemoria();
    ordens.semear(ORDEM, 'LIBERADA');
    useCase = new CancelarReservaUseCase(reservas, ordens);
    reservas.semear(Reserva.criar({ ...entradaValida, idReserva: ID_RESERVA }));
  });

  it('cancela e preserva o registro', async () => {
    const dto = await useCase.executar({ idReserva: ID_RESERVA, estabelecimentoId: ESTAB });

    expect(dto.status).toBe(StatusReserva.CANCELADA);
    expect(dto.itemCodigo).toBe('MP-001');
    expect(await reservas.buscarPorId(ID_RESERVA)).not.toBeNull();
  });

  it('é idempotente: cancelar de novo não erra nem regrava', async () => {
    await useCase.executar({ idReserva: ID_RESERVA, estabelecimentoId: ESTAB });
    const gravacoes = reservas.gravacoes;

    const dto = await useCase.executar({ idReserva: ID_RESERVA, estabelecimentoId: ESTAB });

    expect(dto.status).toBe(StatusReserva.CANCELADA);
    expect(reservas.gravacoes).toBe(gravacoes);
  });

  it('404 quando a reserva não existe', async () => {
    await expect(
      useCase.executar({
        idReserva: '55555555-5555-4555-8555-555555555555',
        estabelecimentoId: ESTAB,
      }),
    ).rejects.toBeInstanceOf(ReservaNaoEncontradaError);
  });

  it('CANCELADA é terminal: alterar a quantidade não a traz de volta', async () => {
    await useCase.executar({ idReserva: ID_RESERVA, estabelecimentoId: ESTAB });

    const editar = new EditarReservaUseCase(reservas, ordens);
    const dto = await editar.executar({
      ...entradaValida,
      idReserva: ID_RESERVA,
      quantidadeRequisitada: 50,
    });

    expect(dto.status).toBe(StatusReserva.CANCELADA);
  });
});
