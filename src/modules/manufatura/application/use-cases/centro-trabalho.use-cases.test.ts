import { describe, it, expect, beforeEach } from 'vitest';
import {
  CriarCentroTrabalhoUseCase,
  EditarCentroTrabalhoUseCase,
} from './centro-trabalho.use-cases.js';
import { Calendario } from '../../domain/entities/calendario.js';
import { GrupoMaquina } from '../../domain/entities/grupo-maquina.js';
import { CentroTrabalho } from '../../domain/entities/centro-trabalho.js';
import type {
  CalendarioRepository,
  CentroTrabalhoRepository,
  CriterioListagem,
  GrupoMaquinaRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  CalendarioNaoEncontradoError,
  CodigoCentroTrabalhoJaExisteError,
  EstabelecimentoInativoError,
  EstabelecimentoSemManufaturaError,
  GrupoMaquinaNaoEncontradoError,
} from '../../domain/exceptions/manufatura.errors.js';

const ESTAB = '11111111-1111-4111-8111-111111111111';
const CALENDARIO = '22222222-2222-4222-8222-222222222222';
const GRUPO = '33333333-3333-4333-8333-333333333333';

class CalendariosEmMemoria implements CalendarioRepository {
  itens = new Map<string, Calendario>();
  async buscarPorId(id: string, estabelecimentoId: string) {
    const c = this.itens.get(id);
    return c && c.estabelecimentoId === estabelecimentoId ? c : null;
  }
  async buscarPorCodigo(codigo: string, estabelecimentoId: string) {
    return (
      [...this.itens.values()].find(
        (c) => c.codigo === codigo && c.estabelecimentoId === estabelecimentoId,
      ) ?? null
    );
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

class GruposEmMemoria implements GrupoMaquinaRepository {
  itens = new Map<string, GrupoMaquina>();
  async buscarPorId(id: string, estabelecimentoId: string) {
    const g = this.itens.get(id);
    return g && g.estabelecimentoId === estabelecimentoId ? g : null;
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
  async salvar(g: GrupoMaquina) {
    this.itens.set(g.idGrupoMaquina, g);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
  async contarCentrosTrabalho() {
    return 0;
  }
}

class CentrosEmMemoria implements CentroTrabalhoRepository {
  itens = new Map<string, CentroTrabalho>();
  gravacoes = 0;
  async buscarPorId(id: string, estabelecimentoId: string) {
    const c = this.itens.get(id);
    return c && c.estabelecimentoId === estabelecimentoId ? c : null;
  }
  async buscarPorCodigo(codigo: string, estabelecimentoId: string) {
    return (
      [...this.itens.values()].find(
        (c) => c.codigo === codigo && c.estabelecimentoId === estabelecimentoId,
      ) ?? null
    );
  }
  async listar(_c: CriterioListagem) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(c: CentroTrabalho) {
    this.gravacoes += 1;
    this.itens.set(c.idCentroTrabalho, c);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
  semear(c: CentroTrabalho) {
    this.itens.set(c.idCentroTrabalho, c);
  }
}

/** Stub da porta anticorpo: controla ativo/manufatura por teste. */
class EstabelecimentoStub implements VerificadorEstabelecimento {
  constructor(
    private ativo = true,
    private manufatura = true,
  ) {}
  async estaAtivo() {
    return this.ativo;
  }
  async temManufatura() {
    return this.manufatura;
  }
}

const idsFixos = (valor: string): GeradorId => ({ gerar: () => valor });

const entradaValida = {
  estabelecimentoId: ESTAB,
  codigo: 'CT-01',
  descricao: 'Injetora 1',
  calendarioId: CALENDARIO,
};

describe('CriarCentroTrabalhoUseCase (CentroTrabalhoRN.AdicionarCentroTrabalho)', () => {
  let calendarios: CalendariosEmMemoria;
  let grupos: GruposEmMemoria;
  let centros: CentrosEmMemoria;

  beforeEach(async () => {
    calendarios = new CalendariosEmMemoria();
    grupos = new GruposEmMemoria();
    centros = new CentrosEmMemoria();

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
    await grupos.salvar(
      GrupoMaquina.criar({
        idGrupoMaquina: GRUPO,
        codigo: 'GM-1',
        descricao: 'Injetoras',
        estabelecimentoId: ESTAB,
      }),
    );
  });

  function montar(estabelecimentos = new EstabelecimentoStub()) {
    return new CriarCentroTrabalhoUseCase(
      centros,
      calendarios,
      grupos,
      estabelecimentos,
      idsFixos('44444444-4444-4444-8444-444444444444'),
    );
  }

  it('cria com os defaults do legado quando só o obrigatório é informado', async () => {
    const dto = await montar().executar(entradaValida);

    expect(dto.codigo).toBe('CT-01');
    expect(dto.status).toBe('ATIVO');
    expect(dto.parametros.tratamentoTempo).toBe('FIXO');
    expect(dto.parametros.tipoUnidadeMedida).toBe('UNIDADE');
    expect(dto.parametros.tempoParadaPadraoMinutos).toBe(0);
    expect(dto.metas.custoMaquinaHora).toBe(0);
    expect(dto.vinculos.grupoMaquinaId).toBeNull();
  });

  it('recusa código em branco — "Código do Centro de trabalho inválido."', async () => {
    await expect(montar().executar({ ...entradaValida, codigo: '   ' })).rejects.toThrow(
      'Código do Centro de trabalho inválido.',
    );
  });

  it('recusa descrição em branco — "Descrição do Centro de trabalho inválida."', async () => {
    await expect(montar().executar({ ...entradaValida, descricao: '' })).rejects.toThrow(
      'Descrição do Centro de trabalho inválida.',
    );
  });

  it('recusa custo/hora negativo, com a mensagem do RN', async () => {
    await expect(
      montar().executar({ ...entradaValida, metas: { custoMaquinaHora: -1 } }),
    ).rejects.toThrow('Custo da Máquina por hora é inválido. Conside valores não negativos.');
  });

  it('recusa estabelecimento inativo', async () => {
    await expect(
      montar(new EstabelecimentoStub(false, true)).executar(entradaValida),
    ).rejects.toBeInstanceOf(EstabelecimentoInativoError);
  });

  it('recusa estabelecimento sem o produto Manufatura', async () => {
    await expect(
      montar(new EstabelecimentoStub(true, false)).executar(entradaValida),
    ).rejects.toBeInstanceOf(EstabelecimentoSemManufaturaError);
  });

  it('recusa calendário inexistente', async () => {
    await expect(
      montar().executar({ ...entradaValida, calendarioId: '55555555-5555-4555-8555-555555555555' }),
    ).rejects.toBeInstanceOf(CalendarioNaoEncontradoError);
  });

  it('aceita grupo de máquina existente e recusa inexistente', async () => {
    const dto = await montar().executar({
      ...entradaValida,
      vinculos: { grupoMaquinaId: GRUPO },
    });
    expect(dto.vinculos.grupoMaquinaId).toBe(GRUPO);

    await expect(
      montar().executar({
        ...entradaValida,
        codigo: 'CT-02',
        vinculos: { grupoMaquinaId: '66666666-6666-4666-8666-666666666666' },
      }),
    ).rejects.toBeInstanceOf(GrupoMaquinaNaoEncontradoError);
  });

  it('recusa código duplicado no mesmo estabelecimento', async () => {
    await montar().executar(entradaValida);
    await expect(montar().executar(entradaValida)).rejects.toBeInstanceOf(
      CodigoCentroTrabalhoJaExisteError,
    );
  });

  it('não grava quando uma referência é inválida', async () => {
    const antes = centros.gravacoes;
    await expect(
      montar(new EstabelecimentoStub(true, false)).executar(entradaValida),
    ).rejects.toThrow();
    expect(centros.gravacoes).toBe(antes);
  });
});

describe('EditarCentroTrabalhoUseCase (CentroTrabalhoRN.EditarCentroTrabalho)', () => {
  let calendarios: CalendariosEmMemoria;
  let grupos: GruposEmMemoria;
  let centros: CentrosEmMemoria;
  let useCase: EditarCentroTrabalhoUseCase;
  const ID = '44444444-4444-4444-8444-444444444444';

  beforeEach(async () => {
    calendarios = new CalendariosEmMemoria();
    grupos = new GruposEmMemoria();
    centros = new CentrosEmMemoria();
    useCase = new EditarCentroTrabalhoUseCase(
      centros,
      calendarios,
      grupos,
      new EstabelecimentoStub(),
    );

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
    centros.semear(
      CentroTrabalho.criar({ ...entradaValida, idCentroTrabalho: ID, estabelecimentoId: ESTAB }),
    );
  });

  it('altera descrição e parâmetros preservando o id', async () => {
    const dto = await useCase.executar({
      ...entradaValida,
      idCentroTrabalho: ID,
      descricao: 'Injetora 1 - revisada',
      parametros: { tratamentoTempo: 'LOTE', tratamentoTempoLote: 100, controlaMaoObra: true },
    });

    expect(dto.idCentroTrabalho).toBe(ID);
    expect(dto.descricao).toBe('Injetora 1 - revisada');
    expect(dto.parametros.tratamentoTempo).toBe('LOTE');
    expect(dto.parametros.tratamentoTempoLote).toBe(100);
    expect(dto.parametros.controlaMaoObra).toBe(true);
  });

  it('bloco de parâmetros omitido volta ao default (PUT descreve o estado final)', async () => {
    await useCase.executar({
      ...entradaValida,
      idCentroTrabalho: ID,
      parametros: { controlaMaoObra: true },
    });
    const dto = await useCase.executar({ ...entradaValida, idCentroTrabalho: ID });

    expect(dto.parametros.controlaMaoObra).toBe(false);
  });

  it('recusa 404 para centro de outro estabelecimento', async () => {
    await expect(
      useCase.executar({
        ...entradaValida,
        idCentroTrabalho: ID,
        estabelecimentoId: '99999999-9999-4999-8999-999999999999',
      }),
    ).rejects.toThrow(/não encontrado/);
  });

  it('permite manter o mesmo código (não acusa colisão consigo mesmo)', async () => {
    const dto = await useCase.executar({ ...entradaValida, idCentroTrabalho: ID });
    expect(dto.codigo).toBe('CT-01');
  });
});
