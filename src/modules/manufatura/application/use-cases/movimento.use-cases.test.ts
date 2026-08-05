import { describe, it, expect, beforeEach } from 'vitest';
import {
  CancelarMovimentoUseCase,
  RegistrarMovimentoUseCase,
  ReintegrarMovimentoUseCase,
  type EntradaMovimento,
} from './movimento.use-cases.js';
import { Movimento, TipoMovimento } from '../../domain/entities/movimento.js';
import { CentroTrabalho } from '../../domain/entities/centro-trabalho.js';
import { Turno, DiaSemana } from '../../domain/entities/turno.js';
import { Reserva } from '../../domain/entities/reserva.js';
import { OrdemProducao } from '../../domain/entities/ordem-producao.js';
import type {
  CatalogoTipos,
  CriterioListagemMovimento,
  MovimentoRepository,
} from '../../domain/repositories/movimento.repositories.js';
import type {
  CentroTrabalhoRepository,
  CriterioListagem,
  CriterioListagemReserva,
  CriterioListagemTurnoRepo,
  ReservaRepository,
  TurnoRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type {
  CriterioOrdemProducao,
  OrdemProducaoRepository,
} from '../../domain/repositories/ordem-producao.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  CentroTrabalhoInativoError,
  MovimentoJaAbertoError,
  TipoNaoCadastradoError,
} from '../../domain/exceptions/movimento.errors.js';

const ESTAB = '11111111-1111-4111-8111-111111111111';
const CENTRO = '22222222-2222-4222-8222-222222222222';
const CALENDARIO = '33333333-3333-4333-8333-333333333333';
const TURNO = '44444444-4444-4444-8444-444444444444';
const ORDEM = '55555555-5555-4555-8555-555555555555';
const RESERVA = '66666666-6666-4666-8666-666666666666';
const ID_MOV = '77777777-7777-4777-8777-777777777777';

class MovimentosEmMemoria implements MovimentoRepository {
  itens = new Map<string, Movimento>();
  gravacoes = 0;
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async buscarAberto(centroTrabalhoId: string, tipos: TipoMovimento[]) {
    const abertos = [...this.itens.values()]
      .filter(
        (m) =>
          m.centroTrabalhoId === centroTrabalhoId &&
          m.estaAberto() &&
          !m.cancelado &&
          tipos.includes(m.tipo),
      )
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime());
    return abertos[0] ?? null;
  }
  async listar(_c: CriterioListagemMovimento) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(m: Movimento) {
    this.gravacoes += 1;
    this.itens.set(m.idMovimento, m);
  }
  semear(m: Movimento) {
    this.itens.set(m.idMovimento, m);
  }
}

class CentrosEmMemoria implements CentroTrabalhoRepository {
  itens = new Map<string, CentroTrabalho>();
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
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
  async salvar(c: CentroTrabalho) {
    this.itens.set(c.idCentroTrabalho, c);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

class TurnosEmMemoria implements TurnoRepository {
  itens = new Map<string, Turno>();
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async buscarPorCodigo() {
    return null;
  }
  async listar(_c: CriterioListagemTurnoRepo) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(t: Turno) {
    this.itens.set(t.idTurno, t);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

class ReservasEmMemoria implements ReservaRepository {
  itens = new Map<string, Reserva>();
  async buscarPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async buscarPorIdentidade() {
    return null;
  }
  async listar(_c: CriterioListagemReserva) {
    return [...this.itens.values()];
  }
  async contar() {
    return this.itens.size;
  }
  async salvar(r: Reserva) {
    this.itens.set(r.idReserva, r);
  }
}

class OrdensEmMemoria implements OrdemProducaoRepository {
  itens = new Set<string>();
  async buscarPorId(id: string) {
    return this.itens.has(id) ? ({ dados: { idOrdemProducao: id } } as unknown as OrdemProducao) : null;
  }
  async buscarPorIdentidade() {
    return null;
  }
  async listar(_c: CriterioOrdemProducao) {
    return [];
  }
  async contar() {
    return 0;
  }
  async salvar() {}
}

/** Catálogo em memória: cria o tipo quando `autocadastrar` (= veio do terminal). */
class CatalogoEmMemoria implements CatalogoTipos {
  cadastrados = new Map<string, string>();
  criados: string[] = [];

  private resolver(prefixo: string, codigo: string, autocadastrar: boolean) {
    const chave = `${prefixo}:${codigo}`;
    const existente = this.cadastrados.get(chave);
    if (existente) return existente;
    if (!autocadastrar) return null;
    const id = `${chave}-novo`;
    this.cadastrados.set(chave, id);
    this.criados.push(chave);
    return id;
  }

  async resolverParada(c: string, _e: string, a: boolean) {
    return this.resolver('parada', c, a);
  }
  async resolverRefugo(c: string, _e: string, a: boolean) {
    return this.resolver('refugo', c, a);
  }
  async resolverCausa(c: string, _e: string, a: boolean) {
    return this.resolver('causa', c, a);
  }
  async resolverRecusa(c: string, _e: string, a: boolean) {
    return this.resolver('recusa', c, a);
  }
}

const idsFixos = (valor: string): GeradorId => ({ gerar: () => valor });

function turnoPadrao(): Turno {
  return Turno.criar({
    idTurno: TURNO,
    codigo: 'T1',
    descricao: 'Manhã',
    calendarioId: CALENDARIO,
    inicioMinutos: 6 * 60,
    fimMinutos: 14 * 60,
    tempoTotalMinutos: 480,
    tempoDisponivelMinutos: 440,
    diasSemana: [DiaSemana.SEGUNDA],
  });
}

function centroPadrao(ativo = true): CentroTrabalho {
  return CentroTrabalho.criar({
    idCentroTrabalho: CENTRO,
    estabelecimentoId: ESTAB,
    codigo: 'CT-01',
    descricao: 'Injetora',
    calendarioId: CALENDARIO,
    ...(ativo ? {} : { status: 'INATIVO' as const }),
  });
}

const entradaBase: EntradaMovimento = {
  estabelecimentoId: ESTAB,
  tipo: TipoMovimento.REPORTE,
  centroTrabalhoId: CENTRO,
  usuarioId: '88888888-8888-4888-8888-888888888888',
  operador: 'OP-01',
  turnoId: TURNO,
  ordemProducaoId: ORDEM,
  quantidades: { unidade: 10 },
};

describe('RegistrarMovimentoUseCase (MovimentosRN.ValidarMovimento)', () => {
  let movimentos: MovimentosEmMemoria;
  let centros: CentrosEmMemoria;
  let ordens: OrdensEmMemoria;
  let reservas: ReservasEmMemoria;
  let turnos: TurnosEmMemoria;
  let catalogo: CatalogoEmMemoria;

  function montar(ativo = true) {
    movimentos = new MovimentosEmMemoria();
    centros = new CentrosEmMemoria();
    ordens = new OrdensEmMemoria();
    reservas = new ReservasEmMemoria();
    turnos = new TurnosEmMemoria();
    catalogo = new CatalogoEmMemoria();

    void centros.salvar(centroPadrao(ativo));
    void turnos.salvar(turnoPadrao());
    ordens.itens.add(ORDEM);
    void reservas.salvar(
      Reserva.criar({
        idReserva: RESERVA,
        ordemProducaoId: ORDEM,
        sequencia: 1,
        itemCodigo: 'MP-1',
        itemDescricao: 'Chapa',
      }),
    );

    return new RegistrarMovimentoUseCase(
      movimentos,
      centros,
      ordens,
      reservas,
      turnos,
      catalogo,
      idsFixos(ID_MOV),
    );
  }

  beforeEach(() => montar());

  it('registra um reporte simples', async () => {
    const dto = await montar().executar(entradaBase);

    expect(dto.idMovimento).toBe(ID_MOV);
    expect(dto.tipo).toBe(TipoMovimento.REPORTE);
    expect(dto.quantidades.unidade).toBe(10);
    expect(dto.cancelado).toBe(false);
  });

  it('recusa operador vazio — "Código Operador está vazio."', async () => {
    await expect(montar().executar({ ...entradaBase, operador: '  ' })).rejects.toThrow(
      'Código Operador está vazio.',
    );
  });

  it('exige ordem para os tipos que a requerem', async () => {
    await expect(
      montar().executar({ ...entradaBase, ordemProducaoId: null }),
    ).rejects.toThrow("Movimentos do tipo 'Reporte' precisam de uma ordem associada.");
  });

  it.each([
    TipoMovimento.PARADA,
    TipoMovimento.ALERTA,
    TipoMovimento.RECUSA,
    TipoMovimento.TROCA_FERRAMENTAL,
    TipoMovimento.TROCA_TURNO,
  ])('dispensa ordem no tipo %s', async (tipo) => {
    const extra =
      tipo === TipoMovimento.PARADA
        ? { tipoParadaCodigo: 'P1' }
        : tipo === TipoMovimento.RECUSA
          ? { tipoRecusaCodigo: 'R1' }
          : {};
    const useCase = montar();
    catalogo.cadastrados.set('parada:P1', 'id-parada');
    catalogo.cadastrados.set('recusa:R1', 'id-recusa');

    const dto = await useCase.executar({
      ...entradaBase,
      tipo,
      ordemProducaoId: null,
      ...extra,
    });
    expect(dto.tipo).toBe(tipo);
  });

  it.each([TipoMovimento.REQUISICAO, TipoMovimento.DEVOLUCAO])(
    '%s exige reserva associada',
    async (tipo) => {
      await expect(montar().executar({ ...entradaBase, tipo })).rejects.toThrow(
        'precisam de uma Reserva associada.',
      );
    },
  );

  it('PARADA exige tipo de parada', async () => {
    await expect(
      montar().executar({ ...entradaBase, tipo: TipoMovimento.PARADA, ordemProducaoId: null }),
    ).rejects.toThrow("Movimentos do tipo 'Parada' precisam de um tipo parada associado.");
  });

  it('REFUGO exige tipo de refugo', async () => {
    await expect(
      montar().executar({ ...entradaBase, tipo: TipoMovimento.REFUGO }),
    ).rejects.toThrow("Movimentos do tipo 'Refugo' precisam de um tipo refugo associado.");
  });

  it('recusa centro de trabalho inativo quando vem do site', async () => {
    await expect(montar(false).executar(entradaBase)).rejects.toBeInstanceOf(
      CentroTrabalhoInativoError,
    );
  });

  it('aceita centro inativo quando vem do terminal', async () => {
    const dto = await montar(false).executar({ ...entradaBase, origemTerminal: true });
    expect(dto.idMovimento).toBe(ID_MOV);
  });

  // ------------------------------------------------------- estorno automático
  it('converte REPORTE com quantidade negativa em ESTORNO e inverte o sinal', async () => {
    const dto = await montar().executar({
      ...entradaBase,
      quantidades: { unidade: -7 },
    });

    expect(dto.tipo).toBe(TipoMovimento.ESTORNO);
    expect(dto.quantidades.unidade).toBe(7);
  });

  it('só converte na unidade que o centro reporta', async () => {
    // O centro reporta em UNIDADE; um valor negativo em PESO não vira estorno.
    const dto = await montar().executar({
      ...entradaBase,
      quantidades: { unidade: 5, peso: -3 },
    });

    expect(dto.tipo).toBe(TipoMovimento.REPORTE);
    expect(dto.quantidades.peso).toBe(-3);
  });

  it('não converte outros tipos com quantidade negativa', async () => {
    const useCase = montar();
    catalogo.cadastrados.set('refugo:RF1', 'id-refugo');

    const dto = await useCase.executar({
      ...entradaBase,
      tipo: TipoMovimento.REFUGO,
      tipoRefugoCodigo: 'RF1',
      quantidades: { unidade: -2 },
    });
    expect(dto.tipo).toBe(TipoMovimento.REFUGO);
  });

  // ------------------------------------------------- autocadastro do terminal
  it('autocadastra classificação desconhecida vinda do terminal', async () => {
    const useCase = montar();
    const dto = await useCase.executar({
      ...entradaBase,
      tipo: TipoMovimento.PARADA,
      ordemProducaoId: null,
      tipoParadaCodigo: 'NOVO-01',
      origemTerminal: true,
    });

    expect(dto.tipoParadaId).toBe('parada:NOVO-01-novo');
    expect(catalogo.criados).toContain('parada:NOVO-01');
  });

  it('recusa classificação desconhecida vinda do site', async () => {
    await expect(
      montar().executar({
        ...entradaBase,
        tipo: TipoMovimento.PARADA,
        ordemProducaoId: null,
        tipoParadaCodigo: 'NOVO-01',
      }),
    ).rejects.toBeInstanceOf(TipoNaoCadastradoError);
  });

  it('a mensagem do tipo não cadastrado segue o formato do RN', async () => {
    await expect(
      montar().executar({
        ...entradaBase,
        tipo: TipoMovimento.PARADA,
        ordemProducaoId: null,
        tipoParadaCodigo: 'XPTO',
      }),
    ).rejects.toThrow("Código Parada 'XPTO' não cadastrado.");
  });

  // ---------------------------------------------------------- não-paralelismo
  it('recusa abrir um segundo movimento exclusivo no mesmo centro', async () => {
    const useCase = montar();
    await useCase.executar(entradaBase); // reporte aberto

    await expect(useCase.executar(entradaBase)).rejects.toBeInstanceOf(MovimentoJaAbertoError);
  });

  it('permite abrir se o anterior já foi encerrado', async () => {
    const useCase = montar();
    const inicio = new Date(2026, 7, 5, 8, 0);
    await useCase.executar({ ...entradaBase, inicio, fim: new Date(2026, 7, 5, 9, 0) });

    const dto = await useCase.executar({ ...entradaBase, inicio: new Date(2026, 7, 5, 9, 1) });
    expect(dto.idMovimento).toBe(ID_MOV);
  });

  it('tipos não exclusivos podem coexistir com um exclusivo aberto', async () => {
    const useCase = montar();
    await useCase.executar(entradaBase); // REPORTE aberto

    const dto = await useCase.executar({ ...entradaBase, tipo: TipoMovimento.ALERTA });
    expect(dto.tipo).toBe(TipoMovimento.ALERTA);
  });

  // ------------------------------------------------------------------- tempos
  it('deriva a duração de (fim - inicio)', async () => {
    const dto = await montar().executar({
      ...entradaBase,
      inicio: new Date(2026, 7, 5, 8, 0, 0),
      fim: new Date(2026, 7, 5, 8, 30, 0),
    });
    expect(dto.duracaoSegundos).toBe(1800);
  });

  it('não deriva duração quando o movimento segue aberto', async () => {
    const dto = await montar().executar(entradaBase);
    expect(dto.duracaoSegundos).toBeNull();
  });

  it('movimento encerrado que não reporta ao ERP já nasce integrado', async () => {
    const dto = await montar().executar({
      ...entradaBase,
      fim: new Date(),
      reportaErp: false,
    });
    expect(dto.dataIntegracao).not.toBeNull();
  });
});

describe('CancelarMovimentoUseCase / ReintegrarMovimentoUseCase', () => {
  let movimentos: MovimentosEmMemoria;
  let cancelar: CancelarMovimentoUseCase;
  let reintegrar: ReintegrarMovimentoUseCase;

  function novoMovimento(overrides: Partial<Parameters<typeof Movimento.criar>[0]> = {}) {
    return Movimento.criar({
      idMovimento: ID_MOV,
      tipo: TipoMovimento.REPORTE,
      centroTrabalhoId: CENTRO,
      usuarioId: '88888888-8888-4888-8888-888888888888',
      operador: 'OP-01',
      turnoId: TURNO,
      ordemProducaoId: ORDEM,
      unidadeMedidaCentro: 'UNIDADE',
      ...overrides,
    });
  }

  beforeEach(() => {
    movimentos = new MovimentosEmMemoria();
    cancelar = new CancelarMovimentoUseCase(movimentos);
    reintegrar = new ReintegrarMovimentoUseCase(movimentos);
  });

  it('cancela e monta a observação com timestamp', async () => {
    movimentos.semear(novoMovimento());

    const dto = await cancelar.executar({
      idMovimento: ID_MOV,
      estabelecimentoId: ESTAB,
      observacao: 'erro de apontamento',
    });

    expect(dto.cancelado).toBe(true);
    expect(dto.observacao).toMatch(/^Movimento cancelado \(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\): erro de apontamento$/);
  });

  it('preserva a observação anterior concatenando com " | "', async () => {
    movimentos.semear(novoMovimento({ observacao: 'lote 42' }));

    const dto = await cancelar.executar({
      idMovimento: ID_MOV,
      estabelecimentoId: ESTAB,
      observacao: 'refeito',
    });

    expect(dto.observacao).toMatch(/^lote 42 \| Movimento cancelado \(/);
  });

  it('recusa cancelar duas vezes', async () => {
    movimentos.semear(novoMovimento());
    await cancelar.executar({ idMovimento: ID_MOV, estabelecimentoId: ESTAB });

    await expect(
      cancelar.executar({ idMovimento: ID_MOV, estabelecimentoId: ESTAB }),
    ).rejects.toThrow(`Movimento '${ID_MOV}' já está cancelado`);
  });

  it('recusa cancelar movimento já integrado', async () => {
    // fim + reportaErp=false ⇒ dataIntegracao preenchida na criação.
    movimentos.semear(novoMovimento({ fim: new Date(), reportaErp: false }));

    await expect(
      cancelar.executar({ idMovimento: ID_MOV, estabelecimentoId: ESTAB }),
    ).rejects.toThrow('já está integrado');
  });

  it('reintegra apenas movimentos que reportam ao ERP', async () => {
    movimentos.semear(novoMovimento({ fim: new Date(), reportaErp: true }));
    const dto = await reintegrar.executar({ idMovimento: ID_MOV, estabelecimentoId: ESTAB });

    expect(dto.dataIntegracao).toBeNull();
    expect(dto.cancelado).toBe(false);
  });

  it('recusa reintegrar movimento que não reporta ao ERP', async () => {
    movimentos.semear(novoMovimento({ reportaErp: false }));

    await expect(
      reintegrar.executar({ idMovimento: ID_MOV, estabelecimentoId: ESTAB }),
    ).rejects.toThrow('não é um movimento considerado na integração');
  });
});
