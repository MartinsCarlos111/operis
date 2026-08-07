import { StatusRecurso } from '@shared/domain/status-recurso.js';

interface FerramentaProps {
  idFerramenta: string;
  codigo: string;
  descricao: string;
  vidaUtilUnidade: number | null;
  vidaUtilSegundos: number | null;
  status: StatusRecurso;
  estabelecimentoId: string;
}

export interface DadosFerramenta {
  codigo: string;
  descricao: string;
  vidaUtilUnidade?: number | null | undefined;
  vidaUtilSegundos?: number | null | undefined;
  estabelecimentoId: string;
  status?: StatusRecurso | undefined;
}

/**
 * Ferramenta de manufatura (migrada de Octopus `Ferramenta`). Catálogo do
 *Tenant — identidade natural é `(estabelecimentoId, codigo)`. A vida útil é
 * o orçamento que o `CalcularConsumoFerramenta` desconta a cada apontamento.
 */
export class Ferramenta {
  private constructor(private props: FerramentaProps) {}

  static criar(input: DadosFerramenta & { idFerramenta: string }): Ferramenta {
    if (!input.codigo.trim()) throw new Error('Código da ferramenta não pode ser vazio.');
    if (input.vidaUtilUnidade !== null && input.vidaUtilUnidade !== undefined && input.vidaUtilUnidade < 0) {
      throw new Error('Vida útil (unidade) não pode ser negativa.');
    }
    const agora = new Date();
    return new Ferramenta({
      idFerramenta: input.idFerramenta,
      codigo: input.codigo,
      descricao: input.descricao,
      vidaUtilUnidade: input.vidaUtilUnidade ?? null,
      vidaUtilSegundos: input.vidaUtilSegundos ?? null,
      status: input.status ?? StatusRecurso.ATIVO,
      estabelecimentoId: input.estabelecimentoId,
    });
  }

  static restaurar(props: FerramentaProps): Ferramenta {
    return new Ferramenta(props);
  }

  get idFerramenta(): string {
    return this.props.idFerramenta;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get vidaUtilUnidade(): number | null {
    return this.props.vidaUtilUnidade;
  }
  get vidaUtilSegundos(): number | null {
    return this.props.vidaUtilSegundos;
  }
  get status(): StatusRecurso {
    return this.props.status;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
}