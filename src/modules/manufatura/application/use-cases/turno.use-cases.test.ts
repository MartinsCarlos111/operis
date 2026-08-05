import { describe, it, expect, beforeEach } from 'vitest';
import { CriarTurnoUseCase } from './turno.use-cases.js';
import { Turno, DiaSemana, type DadosTurno } from '../../domain/entities/turno.js';
import { Calendario } from '../../domain/entities/calendario.js';
import type {
  CalendarioRepository,
  CriterioListagem,
  CriterioListagemTurnoRepo,
  TurnoRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  CalendarioNaoEncontradoError,
  CodigoTurnoJaExisteError,
} from '../../domain/exceptions/manufatura.errors.js';

const ESTAB = '11111111-1111-4111-8111-111111111111';
const CALENDARIO = '22222222-2222-4222-8222-222222222222';
const ID_TURNO = '33333333-3333-4333-8333-333333333333';

class CalendariosEmMemoria implements CalendarioRepository {
  itens = new Map<string, Calendario>();
  async buscarPorId(id: string, estabelecimentoId: string) {
    const c = this.itens.get(id);
    return c && c.estabelecimentoId === estabelecimentoId ? c : null;
  }
  async buscarPorCodigo() {
    return null;
  }
  async listar(_c: CriterioListagem) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(c: Calendario) {
    this.itens.set(c.idCalendario, c);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
  async contarCentrosTrabalho() {
    return 0;
  }
}

class TurnosEmMemoria implements TurnoRepository {
  itens = new Map<string, Turno>();
  gravacoes = 0;
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async buscarPorCodigo(codigo: string, calendarioId: string) {
    return (
      [...this.itens.values()].find(
        (t) => t.codigo === codigo && t.calendarioId === calendarioId,
      ) ?? null
    );
  }
  async listar(_c: CriterioListagemTurnoRepo) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(t: Turno) {
    this.gravacoes += 1;
    this.itens.set(t.idTurno, t);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

const idsFixos = (valor: string): GeradorId => ({ gerar: () => valor });

/** Turno diurno padrão: 06:00 → 14:00, seg a sex. */
const entradaValida = {
  estabelecimentoId: ESTAB,
  codigo: 'T1',
  descricao: 'Turno da manhã',
  calendarioId: CALENDARIO,
  inicioMinutos: 6 * 60,
  fimMinutos: 14 * 60,
  tempoTotalMinutos: 480,
  tempoDisponivelMinutos: 440,
  diasSemana: [
    DiaSemana.SEGUNDA,
    DiaSemana.TERCA,
    DiaSemana.QUARTA,
    DiaSemana.QUINTA,
    DiaSemana.SEXTA,
  ],
};

describe('CriarTurnoUseCase (TurnoRN.ValidarTurno)', () => {
  let calendarios: CalendariosEmMemoria;
  let turnos: TurnosEmMemoria;
  let useCase: CriarTurnoUseCase;

  beforeEach(async () => {
    calendarios = new CalendariosEmMemoria();
    turnos = new TurnosEmMemoria();
    useCase = new CriarTurnoUseCase(turnos, calendarios, idsFixos(ID_TURNO));

    await calendarios.salvar(
      Calendario.restaurar({
        idCalendario: CALENDARIO,
        codigo: 'CAL-1',
        descricao: 'Padrão',
        status: 'ATIVO',
        estabelecimentoId: ESTAB,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      }),
    );
  });

  it('cria um turno válido', async () => {
    const dto = await useCase.executar(entradaValida);

    expect(dto.idTurno).toBe(ID_TURNO);
    expect(dto.codigo).toBe('T1');
    expect(dto.duracaoMinutos).toBe(480);
    expect(dto.util).toBe(true);
    expect(dto.status).toBe('ATIVO');
  });

  it('recusa código em branco — "Código Turno inválido."', async () => {
    await expect(useCase.executar({ ...entradaValida, codigo: '  ' })).rejects.toThrow(
      'Código Turno inválido.',
    );
  });

  it('recusa descrição em branco — "Descrição do Turno inválida."', async () => {
    await expect(useCase.executar({ ...entradaValida, descricao: '' })).rejects.toThrow(
      'Descrição do Turno inválida.',
    );
  });

  it('recusa lista de dias vazia — "Selecione ao menos um dia da semana."', async () => {
    await expect(useCase.executar({ ...entradaValida, diasSemana: [] })).rejects.toThrow(
      'Selecione ao menos um dia da semana.',
    );
  });

  it('recusa tempo disponível zero', async () => {
    await expect(
      useCase.executar({ ...entradaValida, tempoDisponivelMinutos: 0 }),
    ).rejects.toThrow('Tempo disponível não pode ser zero.');
  });

  it('recusa tempo total zero', async () => {
    await expect(
      useCase.executar({ ...entradaValida, tempoTotalMinutos: 0, tempoDisponivelMinutos: 10 }),
    ).rejects.toThrow('Tempo total não pode ser zero.');
  });

  it('recusa disponível maior que total', async () => {
    await expect(
      useCase.executar({
        ...entradaValida,
        tempoTotalMinutos: 400,
        tempoDisponivelMinutos: 480,
      }),
    ).rejects.toThrow('Tempo Disponível não pode ser maior que o Tempo Total.');
  });

  it('aceita disponível igual ao total (o RN só barra "maior que")', async () => {
    const dto = await useCase.executar({
      ...entradaValida,
      tempoTotalMinutos: 480,
      tempoDisponivelMinutos: 480,
    });
    expect(dto.tempoDisponivelMinutos).toBe(480);
  });

  it('recusa calendário inexistente', async () => {
    await expect(
      useCase.executar({
        ...entradaValida,
        calendarioId: '44444444-4444-4444-8444-444444444444',
      }),
    ).rejects.toBeInstanceOf(CalendarioNaoEncontradoError);
  });

  it('recusa calendário de outro estabelecimento', async () => {
    await expect(
      useCase.executar({
        ...entradaValida,
        estabelecimentoId: '55555555-5555-4555-8555-555555555555',
      }),
    ).rejects.toBeInstanceOf(CalendarioNaoEncontradoError);
  });

  it('recusa código duplicado no mesmo calendário', async () => {
    await useCase.executar(entradaValida);
    await expect(useCase.executar(entradaValida)).rejects.toBeInstanceOf(
      CodigoTurnoJaExisteError,
    );
  });

  it('deduplica dias da semana repetidos', async () => {
    const dto = await useCase.executar({
      ...entradaValida,
      diasSemana: [DiaSemana.SEGUNDA, DiaSemana.SEGUNDA, DiaSemana.TERCA],
    });
    expect(dto.diasSemana).toEqual([DiaSemana.SEGUNDA, DiaSemana.TERCA]);
  });

  it('não grava quando a validação falha', async () => {
    await expect(useCase.executar({ ...entradaValida, diasSemana: [] })).rejects.toThrow();
    expect(turnos.gravacoes).toBe(0);
  });
});

describe('Turno.resolverJanela — turno que cruza a meia-noite', () => {
  function turnoDe(dados: Partial<DadosTurno>): Turno {
    return Turno.criar({ ...entradaValida, ...dados, idTurno: ID_TURNO });
  }

  it('turno diurno termina no mesmo dia', () => {
    // 06:00 → 14:00 em 05/08/2026 (quarta).
    const janela = turnoDe({}).resolverJanela(new Date(2026, 7, 5));

    expect(janela.viraODia).toBe(false);
    expect(janela.inicio).toEqual(new Date(2026, 7, 5, 6, 0));
    expect(janela.fim).toEqual(new Date(2026, 7, 5, 14, 0));
  });

  it('turno noturno 22:00→06:00 termina no dia seguinte (regra do CalculoIndicadoresRN)', () => {
    const turno = turnoDe({ inicioMinutos: 22 * 60, fimMinutos: 6 * 60 });
    const janela = turno.resolverJanela(new Date(2026, 7, 5));

    expect(janela.viraODia).toBe(true);
    expect(janela.inicio).toEqual(new Date(2026, 7, 5, 22, 0));
    expect(janela.fim).toEqual(new Date(2026, 7, 6, 6, 0));
    expect(turno.duracaoMinutos()).toBe(480);
  });

  it('início igual ao fim vira 24h (o legado usa >=, não >)', () => {
    const turno = turnoDe({ inicioMinutos: 8 * 60, fimMinutos: 8 * 60 });
    const janela = turno.resolverJanela(new Date(2026, 7, 5));

    expect(janela.viraODia).toBe(true);
    expect(janela.fim).toEqual(new Date(2026, 7, 6, 8, 0));
    expect(turno.duracaoMinutos()).toBe(1440);
  });

  it('atravessa a virada do mês corretamente', () => {
    const turno = turnoDe({ inicioMinutos: 23 * 60, fimMinutos: 7 * 60 });
    const janela = turno.resolverJanela(new Date(2026, 7, 31)); // 31/08

    expect(janela.fim).toEqual(new Date(2026, 8, 1, 7, 0)); // 01/09
  });

  it('praticadoEm respeita os dias configurados', () => {
    const turno = turnoDe({ diasSemana: [DiaSemana.SABADO] });

    expect(turno.praticadoEm(new Date(2026, 7, 8))).toBe(true); // sábado
    expect(turno.praticadoEm(new Date(2026, 7, 5))).toBe(false); // quarta
  });
});
