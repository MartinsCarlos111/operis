import type { TipoMovimento } from '@modules/manufatura/domain/entities/movimento.js';

/**
 * Detalhe por movimento do cálculo de OEE (migrado de `MovimentosCalculoIndicadores`).
 * Cada `Movimento` que entrou no agregado deixa a sua contribuição aqui —
 * tanto para auditoria (saber quanto cada parada contribuiu para a
 * disponibilidade) quanto para o recálculo: `ReintegrarMovimentoUseCase`,
 * ao invalidar um movimento, marca `recalcular=true` aqui, e o
 * `IndicadoresWorker` refaz o agregado dono.
 */
interface MovimentoCalculoIndicadoresProps {
  idMovimentoCalculoIndicadores: string;
  calculoIndicadoresId: string;
  movimentoId: string;
  quantidade: number;
  tempoSegundos: number;
  tipo: TipoMovimento;
  consideraOee: boolean;
  cicloPadraoOrdem: number;
  custoMaquinaHora: number;
  recalcular: boolean;
}

export interface DadosMovimentoCalculoIndicadores {
  calculoIndicadoresId: string;
  movimentoId: string;
  quantidade: number;
  tempoSegundos: number;
  tipo: TipoMovimento;
  consideraOee: boolean;
  cicloPadraoOrdem: number;
  custoMaquinaHora: number;
}

export class MovimentoCalculoIndicadores {
  private constructor(private props: MovimentoCalculoIndicadoresProps) {}

  static criar(input: DadosMovimentoCalculoIndicadores & { id: string }): MovimentoCalculoIndicadores {
    if (input.tempoSegundos < 0) {
      throw new Error('Tempo contribuído não pode ser negativo.');
    }
    return new MovimentoCalculoIndicadores({
      idMovimentoCalculoIndicadores: input.id,
      calculoIndicadoresId: input.calculoIndicadoresId,
      movimentoId: input.movimentoId,
      quantidade: input.quantidade,
      tempoSegundos: input.tempoSegundos,
      tipo: input.tipo,
      consideraOee: input.consideraOee,
      cicloPadraoOrdem: input.cicloPadraoOrdem,
      custoMaquinaHora: input.custoMaquinaHora,
      recalcular: false,
    });
  }

  static restaurar(props: MovimentoCalculoIndicadoresProps): MovimentoCalculoIndicadores {
    return new MovimentoCalculoIndicadores(props);
  }

  invalidar(): void {
    this.props.recalcular = true;
  }

  get idMovimentoCalculoIndicadores(): string {
    return this.props.idMovimentoCalculoIndicadores;
  }
  get calculoIndicadoresId(): string {
    return this.props.calculoIndicadoresId;
  }
  get movimentoId(): string {
    return this.props.movimentoId;
  }
  get quantidade(): number {
    return this.props.quantidade;
  }
  get tempoSegundos(): number {
    return this.props.tempoSegundos;
  }
  get tipo(): TipoMovimento {
    return this.props.tipo;
  }
  get consideraOee(): boolean {
    return this.props.consideraOee;
  }
  get cicloPadraoOrdem(): number {
    return this.props.cicloPadraoOrdem;
  }
  get custoMaquinaHora(): number {
    return this.props.custoMaquinaHora;
  }
  get recalcular(): boolean {
    return this.props.recalcular;
  }
}