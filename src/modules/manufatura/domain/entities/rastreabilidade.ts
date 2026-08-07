interface RastreabilidadeProps {
  idRastreabilidade: string;
  etiquetaId: string;
  ordemProducaoId: string;
  movimentoId: string | null;
  itemCodigo: string;
  itemDescricao: string | null;
  lote: string | null;
  serie: string | null;
  quantidadeProduzida: number;
  quantidadeRefugo: number;
}

export interface DadosRastreabilidade {
  etiquetaId: string;
  ordemProducaoId: string;
  movimentoId?: string | null | undefined;
  itemCodigo: string;
  itemDescricao?: string | null | undefined;
  lote?: string | null | undefined;
  serie?: string | null | undefined;
  quantidadeProduzida: number;
  quantidadeRefugo?: number | undefined;
}

/**
 * Rastreabilidade (migrada de Octopus `Rastreabilidade`). Linha que liga
 * etiqueta↔ordem↔movimento↔qtd — é o trilho que a integração ERP percorre
 * para enviar ao cliente os itens efetivamente produzidos.
 *
 * Imutável: criada no reporte, atualizada apenas na promoção para histórico.
 */
export class Rastreabilidade {
  private constructor(private props: RastreabilidadeProps) {}

  static criar(input: DadosRastreabilidade & { idRastreabilidade: string }): Rastreabilidade {
    if (!input.itemCodigo.trim()) {
      throw new Error('Código do item da rastreabilidade não pode ser vazio.');
    }
    if (input.quantidadeProduzida < 0) {
      throw new Error('Quantidade produzida da rastreabilidade não pode ser negativa.');
    }
    return new Rastreabilidade({
      idRastreabilidade: input.idRastreabilidade,
      etiquetaId: input.etiquetaId,
      ordemProducaoId: input.ordemProducaoId,
      movimentoId: input.movimentoId ?? null,
      itemCodigo: input.itemCodigo,
      itemDescricao: input.itemDescricao ?? null,
      lote: input.lote ?? null,
      serie: input.serie ?? null,
      quantidadeProduzida: input.quantidadeProduzida,
      quantidadeRefugo: input.quantidadeRefugo ?? 0,
    });
  }

  static restaurar(props: RastreabilidadeProps): Rastreabilidade {
    return new Rastreabilidade(props);
  }

  get idRastreabilidade(): string {
    return this.props.idRastreabilidade;
  }
  get etiquetaId(): string {
    return this.props.etiquetaId;
  }
  get ordemProducaoId(): string {
    return this.props.ordemProducaoId;
  }
  get movimentoId(): string | null {
    return this.props.movimentoId;
  }
  get itemCodigo(): string {
    return this.props.itemCodigo;
  }
  get itemDescricao(): string | null {
    return this.props.itemDescricao;
  }
  get lote(): string | null {
    return this.props.lote;
  }
  get serie(): string | null {
    return this.props.serie;
  }
  get quantidadeProduzida(): number {
    return this.props.quantidadeProduzida;
  }
  get quantidadeRefugo(): number {
    return this.props.quantidadeRefugo;
  }
}