import type { JanelaTurno } from '@modules/manufatura/domain/entities/turno.js';
import type { Turno } from '@modules/manufatura/domain/entities/turno.js';
import {
  CalculoIndicadores,
  type ContribuicaoMovimento,
} from '../entities/calculo-indicadores.js';
import { MovimentoCalculoIndicadores } from '../entities/movimento-calculo-indicadores.js';
import type { CalculoIndicadoresRepository, FonteMovimentos } from '../repositories/calculo-indicadores.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';

/**
 * Mínimo que o `MontarOeeService` precisa do `Turno` — manter a fronteira
 * protegida evitando importar a entidade concreta (que pertence ao módulo
 * manufatura). Implementadores podem usar o `Turno` real ou um proxy
 * montado a partir do Prisma (ver `indicadores-worker.ts`).
 */
export interface TurnoLike {
  idTurno: string;
  inicioMinutos: number;
  fimMinutos: number;
  tempoTotalMinutos: number;
  tempoDisponivelMinutos: number;
  diasSemana: ReadonlyArray<string>;
  resolverJanela(dia: Date): JanelaTurno;
  praticadoEm(dia: Date): boolean;
}

void (null as unknown as Turno);

/**
 * Service domain responsável pela portabilidade de `CalculoIndicadoresRN`:
 *
 *   MontarOEE(idTurno, idCentroTrabalho, diaTurno, movimentos, ...)
 *     ├─ MontarPreCalculosOEE  (separar qtdProduzida/qtdRefugo/tempos)
 *    ├─ CadastrarPreCalculosEOEE (gravar MovimentosCalculoIndicadores)
 *    └─ AtualizarCalculoIndicadoresDia (consolidação turnoId=NULL)
 *
 * O `MontarOeeService` recálcula um agregado único (centro+turno+dia) e
 * grava; a consolidação do dia é responsabilidade do use-case
 * `AtualizarCalculoIndicadoresDiaUseCase` (que chama `consolidarDia` na
 * entidade).
 *
 * NÃO é fire-and-forget: o worker chama para cada par (centro, turno) com
 * `recalcular=true` ou novo.
 */
export class MontarOeeService {
  constructor(
    private readonly fontes: FonteMovimentos,
    private readonly repos: CalculoIndicadoresRepository,
    private readonly ids: GeradorId,
  ) {}

  async montarPorTurno(input: {
    estabelecimentoId: string;
    centroTrabalhoId: string;
    turno: TurnoLike;
    diaTurno: Date;
    custoMaquinaHora: number;
    qtdMeta: number;
  }): Promise<CalculoIndicadores | null> {
    // Resolve a janela do turno no dia concreto (paridade com `Turno.resolverJanela`).
    const janela = input.turno.resolverJanela(input.diaTurno);
    // Sempre recalcula: paridade com o loop do `CalcularOEE` que itera
    // movimentos "a calcular" — aqui buscamos todos; o recalcular=true
    // reside nos detalhes (`MovimentoCalculoIndicadores.recalcular`).
    const movimentos = await this.fontes.listarPorJanela(
      input.centroTrabalhoId,
      janela.inicio,
      janela.fim,
      false,
    );
    if (movimentos.length === 0) return null;

    let agregado = await this.repos.buscarPorChave(
      input.centroTrabalhoId,
      input.turno.idTurno,
      inicioDia(input.diaTurno),
    );
    if (!agregado) {
      agregado = CalculoIndicadores.criar({
        idCalculoIndicadores: this.ids.gerar(),
        estabelecimentoId: input.estabelecimentoId,
        centroTrabalhoId: input.centroTrabalhoId,
        turnoId: input.turno.idTurno,
        diaTurno: inicioDia(input.diaTurno),
        custoMaquinaHora: input.custoMaquinaHora,
        qtdMeta: input.qtdMeta,
      });
    }

    // Tempo total/disponível do turno, convertido para segundos.
    const tempoTotalSeg = input.turno.tempoTotalMinutos * 60;
    const tempoDisponivelSeg = input.turno.tempoDisponivelMinutos * 60;

    const contribuicoes: ReadonlyArray<ContribuicaoMovimento> = movimentos.map((m) => ({
      movimentoId: m.movimentoId,
      tipo: m.tipo,
      quantidade: m.quantidade,
      tempoSegundos: m.tempoSegundos,
      consideraOee: m.consideraOee,
      cicloPadraoOrdem: m.cicloPadraoOrdem,
      custoMaquinaHora: m.custoMaquinaHora,
    }));

    agregado.recalcularDe(contribuicoes, {
      tempoTotalSeg,
      tempoDisponivelSeg,
      tempoManutencaoSeg: 0,
    });

    const detalhes = movimentos.map((m) =>
      MovimentoCalculoIndicadores.criar({
        id: this.ids.gerar(),
        calculoIndicadoresId: agregado!.idCalculoIndicadores,
        movimentoId: m.movimentoId,
        quantidade: m.quantidade,
        tempoSegundos: m.tempoSegundos,
        tipo: m.tipo,
        consideraOee: m.consideraOee,
        cicloPadraoOrdem: m.cicloPadraoOrdem,
        custoMaquinaHora: m.custoMaquinaHora,
      }),
    );

    await this.repos.salvar(agregado, detalhes);
    return agregado;
  }
}

function inicioDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}