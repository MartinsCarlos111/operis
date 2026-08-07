import type { TipoMovimento } from '@modules/manufatura/domain/entities/movimento.js';

/**
 * Snapshot agregado de OEE/Disponibilidade/Eficiência/Qualidade/TEEP por
 * turno+centro+día (migrado de Octopus `CalculoIndicadores`).
 *
 * A UNIQUE([centroTrabalhoId, turnoId, diaTurno]) no schema repreende a
 * paridade com o upsert por turno original. `diaTurno IS NULL` é a
 * consolidação de dia (paridade com `AtualizarCalculoIndicadoresDia`).
 *
 * Invariantes:
 *   - Os 5 percentuais vivem em [0, 1].
 *   - Tempos/quantidades são >= 0.
 *   - `recalcular=true` invalida; o worker refaz o cálculo.
 */
interface CalculoIndicadoresProps {
  idCalculoIndicadores: string;
  estabelecimentoId: string;
  centroTrabalhoId: string;
  turnoId: string | null;
  diaTurno: Date;
  qtdProduzida: number;
  qtdRefugo: number;
  qtdPerda: number;
  qtdMeta: number;
  tempoProducaoSeg: number;
  tempoParadaSeg: number;
  tempoPreparacaoSeg: number;
  tempoDisponivelSeg: number;
  tempoTotalSeg: number;
  tempoManutencaoSeg: number;
  disponibilidade: number;
  eficiencia: number;
  qualidade: number;
  oee: number;
  teep: number;
  perdaFinanceira: number;
  custoMaquinaHora: number;
  recalcular: boolean;
  ultimaAtualizacao: Date;
}

const NUM_MAX = 99_999_999;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Legado truncava em 99_999_999 para estourar display; preservado por segurança. */
function clampNum(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  return v > NUM_MAX ? NUM_MAX : v;
}

export interface DadosCalculoIndicadores {
  estabelecimentoId: string;
  centroTrabalhoId: string;
  turnoId: string | null;
  diaTurno: Date;
  /** Origem da agregação: ciclo padrão (seg/peça) e custo máquina-hora do centro. */
  custoMaquinaHora: number;
  qtdMeta: number;
}

export interface ContribuicaoMovimento {
  movimentoId: string;
  tipo: TipoMovimento;
  quantidade: number;
  tempoSegundos: number;
  consideraOee: boolean;
  cicloPadraoOrdem: number;
  custoMaquinaHora: number;
}

export class CalculoIndicadores {
  private constructor(private props: CalculoIndicadoresProps) {}

  static criar(input: DadosCalculoIndicadores & { idCalculoIndicadores: string }): CalculoIndicadores {
    if (input.custoMaquinaHora < 0) {
      throw new Error('Custo de máquina-hora não pode ser negativo.');
    }
    if (input.qtdMeta < 0) {
      throw new Error('Quantidade meta não pode ser negativa.');
    }
    const agora = new Date();
    return new CalculoIndicadores({
      idCalculoIndicadores: input.idCalculoIndicadores,
      estabelecimentoId: input.estabelecimentoId,
      centroTrabalhoId: input.centroTrabalhoId,
      turnoId: input.turnoId,
      diaTurno: input.diaTurno,
      qtdProduzida: 0,
      qtdRefugo: 0,
      qtdPerda: 0,
      qtdMeta: clampNum(input.qtdMeta),
      tempoProducaoSeg: 0,
      tempoParadaSeg: 0,
      tempoPreparacaoSeg: 0,
      tempoDisponivelSeg: 0,
      tempoTotalSeg: 0,
      tempoManutencaoSeg: 0,
      disponibilidade: 0,
      eficiencia: 0,
      qualidade: 0,
      oee: 0,
      teep: 0,
      perdaFinanceira: 0,
      custoMaquinaHora: input.custoMaquinaHora,
      recalcular: false,
      ultimaAtualizacao: agora,
    });
  }

  static restaurar(props: CalculoIndicadoresProps): CalculoIndicadores {
    return new CalculoIndicadores(props);
  }

  /**
   * Reagrega a partir dos movimentos do turno (paridade com
   * `CalculoIndicadoresRN.MontarPreCalculosOEE` + `CadastrarPreCalculosEOEE`).
   *
   *   - REPORTE/ESTORNO → soma/diminui produção e tempo
   *   - REFUGO → soma refugo (e tempo parada)
   *   - PARADA/TROCA_TURNO → soma tempo de parada
   *   - PREPARACAO → soma tempo de preparação
   *
   * Movimentos com `consideraOee=false` NÃO entram na disponibilidade/eficiência.
   */
  recalcularDe(
    movimentos: ReadonlyArray<ContribuicaoMovimento>,
    janela: { tempoTotalSeg: number; tempoDisponivelSeg: number; tempoManutencaoSeg: number },
  ): void {
    let qtdProduzida = 0;
    let qtdRefugo = 0;
    let qtdPerda = 0;
    let tempoProducao = 0;
    let tempoParada = 0;
    let tempoPreparacao = 0;

    for (const m of movimentos) {
      if (!m.consideraOee) continue;
      switch (m.tipo) {
        case 'REPORTE':
          qtdProduzida += m.quantidade;
          tempoProducao += m.tempoSegundos;
          break;
        case 'ESTORNO':
          qtdProduzida -= m.quantidade;
          tempoProducao = Math.max(0, tempoProducao - m.tempoSegundos);
          break;
        case 'REFUGO':
          qtdRefugo += m.quantidade;
          qtdPerda += m.quantidade;
          tempoParada += m.tempoSegundos;
          break;
        case 'PARADA':
        case 'TROCA_TURNO':
          tempoParada += m.tempoSegundos;
          break;
        case 'PREPARACAO':
        case 'TROCA_FERRAMENTAL':
          tempoPreparacao += m.tempoSegundos;
          break;
      }
    }

    this.props.qtdProduzida = clampNum(qtdProduzida);
    this.props.qtdRefugo = clampNum(qtdRefugo);
    this.props.qtdPerda = clampNum(qtdPerda);
    this.props.tempoProducaoSeg = clampNum(tempoProducao);
    this.props.tempoParadaSeg = clampNum(tempoParada);
    this.props.tempoPreparacaoSeg = clampNum(tempoPreparacao);
    this.props.tempoTotalSeg = clampNum(janela.tempoTotalSeg);
    this.props.tempoDisponivelSeg = clampNum(janela.tempoDisponivelSeg);
    this.props.tempoManutencaoSeg = clampNum(janela.tempoManutencaoSeg);

    const produzido = this.props.qtdProduzida;
    const totalPecas = produzido + this.props.qtdRefugo;
    const tempoProdutivo = this.props.tempoProducaoSeg;
    const tempoPotencial =
      this.props.tempoDisponivelSeg - this.props.tempoPreparacaoSeg - this.props.tempoParadaSeg;
    const tempoTotalPlanta = this.props.tempoTotalSeg;

    this.props.disponibilidade = clamp01(
      this.props.tempoDisponivelSeg > 0 ? tempoPotencial / this.props.tempoDisponivelSeg : 0,
    );
    this.props.eficiencia = clamp01(
      tempoProdutivo > 0 && tempoPotencial > 0 ? tempoProdutivo / tempoPotencial : 0,
    );
    this.props.qualidade = clamp01(totalPecas > 0 ? produzido / totalPecas : 0);
    this.props.oee = clamp01(this.props.disponibilidade * this.props.eficiencia * this.props.qualidade);
    this.props.teep = clamp01(tempoTotalPlanta > 0 ? (tempoProdutivo / tempoTotalPlanta) * this.props.qualidade : 0);

    this.props.perdaFinanceira = clampNum(this.props.qtdPerda * this.props.custoMaquinaHora);
    this.props.recalcular = false;
    this.props.ultimaAtualizacao = new Date();
  }

  /** Marca para recálculo — usado pelo `ReintegrarMovimentoUseCase`. */
  invalidar(): void {
    this.props.recalcular = true;
  }

  consolidarDia(outrosDoDia: ReadonlyArray<CalculoIndicadores>): void {
    let qtdProduzida = this.props.qtdProduzida;
    let qtdRefugo = this.props.qtdRefugo;
    let qtdPerda = this.props.qtdPerda;
    let qtdMeta = this.props.qtdMeta;
    let tempoProducao = this.props.tempoProducaoSeg;
    let tempoParada = this.props.tempoParadaSeg;
    let tempoPreparacao = this.props.tempoPreparacaoSeg;
    let tempoDisponivel = this.props.tempoDisponivelSeg;
    let tempoTotal = this.props.tempoTotalSeg;
    let tempoManutencao = this.props.tempoManutencaoSeg;
    let perdaFinanceira = this.props.perdaFinanceira;

    for (const o of outrosDoDia) {
      qtdProduzida += o.qtdProduzida;
      qtdRefugo += o.qtdRefugo;
      qtdPerda += o.qtdPerda;
      qtdMeta += o.qtdMeta;
      tempoProducao += o.tempoProducaoSeg;
      tempoParada += o.tempoParadaSeg;
      tempoPreparacao += o.tempoPreparacaoSeg;
      tempoDisponivel += o.tempoDisponivelSeg;
      tempoTotal += o.tempoTotalSeg;
      tempoManutencao += o.tempoManutencaoSeg;
      perdaFinanceira += o.perdaFinanceira;
    }

    this.props.turnoId = null;
    this.props.qtdProduzida = clampNum(qtdProduzida);
    this.props.qtdRefugo = clampNum(qtdRefugo);
    this.props.qtdPerda = clampNum(qtdPerda);
    this.props.qtdMeta = clampNum(qtdMeta);
    this.props.tempoProducaoSeg = clampNum(tempoProducao);
    this.props.tempoParadaSeg = clampNum(tempoParada);
    this.props.tempoPreparacaoSeg = clampNum(tempoPreparacao);
    this.props.tempoDisponivelSeg = clampNum(tempoDisponivel);
    this.props.tempoTotalSeg = clampNum(tempoTotal);
    this.props.tempoManutencaoSeg = clampNum(tempoManutencao);
    this.props.perdaFinanceira = clampNum(perdaFinanceira);
    this.props.recalcular = false;
    this.props.ultimaAtualizacao = new Date();
  }

  get idCalculoIndicadores(): string {
    return this.props.idCalculoIndicadores;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
  get centroTrabalhoId(): string {
    return this.props.centroTrabalhoId;
  }
  get turnoId(): string | null {
    return this.props.turnoId;
  }
  get diaTurno(): Date {
    return this.props.diaTurno;
  }
  get qtdProduzida(): number {
    return this.props.qtdProduzida;
  }
  get qtdRefugo(): number {
    return this.props.qtdRefugo;
  }
  get qtdPerda(): number {
    return this.props.qtdPerda;
  }
  get qtdMeta(): number {
    return this.props.qtdMeta;
  }
  get tempoProducaoSeg(): number {
    return this.props.tempoProducaoSeg;
  }
  get tempoParadaSeg(): number {
    return this.props.tempoParadaSeg;
  }
  get tempoPreparacaoSeg(): number {
    return this.props.tempoPreparacaoSeg;
  }
  get tempoDisponivelSeg(): number {
    return this.props.tempoDisponivelSeg;
  }
  get tempoTotalSeg(): number {
    return this.props.tempoTotalSeg;
  }
  get tempoManutencaoSeg(): number {
    return this.props.tempoManutencaoSeg;
  }
  get disponibilidade(): number {
    return this.props.disponibilidade;
  }
  get eficiencia(): number {
    return this.props.eficiencia;
  }
  get qualidade(): number {
    return this.props.qualidade;
  }
  get oee(): number {
    return this.props.oee;
  }
  get teep(): number {
    return this.props.teep;
  }
  get perdaFinanceira(): number {
    return this.props.perdaFinanceira;
  }
  get custoMaquinaHora(): number {
    return this.props.custoMaquinaHora;
  }
  get recalcular(): boolean {
    return this.props.recalcular;
  }
  get ultimaAtualizacao(): Date {
    return this.props.ultimaAtualizacao;
  }
}