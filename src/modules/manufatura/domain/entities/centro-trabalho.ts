import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { exigirTexto } from './calendario.js';

/** ex-EnumTratamentoTempo. */
export const TratamentoTempo = {
  FIXO: 'FIXO',
  PROPORCIONAL: 'PROPORCIONAL',
  FERRAMENTAL: 'FERRAMENTAL',
  LOTE: 'LOTE',
} as const;
export type TratamentoTempo = (typeof TratamentoTempo)[keyof typeof TratamentoTempo];

/** ex-EnumTipoUnidadeMedida. */
export const TipoUnidadeMedida = {
  UNIDADE: 'UNIDADE',
  METRAGEM: 'METRAGEM',
  PESO: 'PESO',
  AREA: 'AREA',
  VOLUME: 'VOLUME',
  ESPECIFICA: 'ESPECIFICA',
} as const;
export type TipoUnidadeMedida = (typeof TipoUnidadeMedida)[keyof typeof TipoUnidadeMedida];

/** Vínculos opcionais do centro (validados só quando informados). */
export interface VinculosCentroTrabalho {
  grupoMaquinaId: string | null;
  tipoCausaId: string | null;
  tipoParadaId: string | null;
  tipoRecusaId: string | null;
  tipoRefugoId: string | null;
}

/** Parâmetros de apontamento e tempo. */
export interface ParametrosCentroTrabalho {
  controlaMaoObra: boolean;
  preparacao: boolean;
  operacaoBaixada: number | null;
  tempoParadaPadraoMinutos: number;
  tratamentoTempo: TratamentoTempo;
  tratamentoTempoLote: number | null;
  tipoUnidadeMedida: TipoUnidadeMedida;
}

/** Metas de turno (%) e custo. */
export interface MetasCentroTrabalho {
  metaDispTurno: number | null;
  metaDesempTurno: number | null;
  metaQualiTurno: number | null;
  metaOeeTurno: number | null;
  custoMaquinaHora: number;
}

interface CentroTrabalhoProps {
  idCentroTrabalho: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  estabelecimentoId: string;
  calendarioId: string;
  vinculos: VinculosCentroTrabalho;
  parametros: ParametrosCentroTrabalho;
  metas: MetasCentroTrabalho;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Parcial tolerante a `undefined` explícito. `Partial<T>` não serve: o projeto
 * roda com `exactOptionalPropertyTypes`, e o zod produz `T | null | undefined`
 * para campos `.nullable().optional()`.
 */
type Parcial<T> = { [K in keyof T]?: T[K] | undefined };

export interface DadosCentroTrabalho {
  codigo: string;
  descricao: string;
  calendarioId: string;
  vinculos?: Parcial<VinculosCentroTrabalho> | undefined;
  parametros?: Parcial<ParametrosCentroTrabalho> | undefined;
  metas?: Parcial<MetasCentroTrabalho> | undefined;
  status?: StatusRecurso | undefined;
}

/**
 * Centro de Trabalho (migrado de Octopus `CentroTrabalho`). Raiz de agregado.
 *
 * Guarda as invariantes de FORMA do CentroTrabalhoRN.ValidarCentroTrabalho —
 * as que dependem só do próprio objeto:
 *   1. código obrigatório           → "Código do Centro de trabalho inválido."
 *   2. descrição obrigatória        → "Descrição do Centro de trabalho inválida."
 *   3. tratamento de tempo definido → "Tratamento de Tempo inválido."
 *   4. custo/hora não negativo      → "Custo da Máquina por hora é inválido..."
 *
 * As que precisam de banco — calendário existe, estabelecimento do calendário
 * ativo e com produto Manufatura, grupo de máquina do mesmo estabelecimento —
 * ficam no use-case, como no RN original.
 */
export class CentroTrabalho {
  private constructor(private props: CentroTrabalhoProps) {}

  static criar(input: DadosCentroTrabalho & {
    idCentroTrabalho: string;
    estabelecimentoId: string;
  }): CentroTrabalho {
    const agora = new Date();
    return new CentroTrabalho({
      idCentroTrabalho: input.idCentroTrabalho,
      codigo: exigirTexto(input.codigo, 'Código do Centro de trabalho inválido.'),
      descricao: exigirTexto(input.descricao, 'Descrição do Centro de trabalho inválida.'),
      status: input.status ?? StatusRecurso.ATIVO,
      estabelecimentoId: input.estabelecimentoId,
      calendarioId: input.calendarioId,
      vinculos: completarVinculos(input.vinculos),
      parametros: completarParametros(input.parametros),
      metas: completarMetas(input.metas),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: CentroTrabalhoProps): CentroTrabalho {
    return new CentroTrabalho(props);
  }

  /**
   * Aplica os dados editáveis. Como no PUT dos demais cadastros, descreve o
   * estado final: bloco omitido volta ao default, não é mesclado.
   */
  alterar(input: DadosCentroTrabalho): void {
    this.props.codigo = exigirTexto(input.codigo, 'Código do Centro de trabalho inválido.');
    this.props.descricao = exigirTexto(
      input.descricao,
      'Descrição do Centro de trabalho inválida.',
    );
    this.props.calendarioId = input.calendarioId;
    this.props.vinculos = completarVinculos(input.vinculos);
    this.props.parametros = completarParametros(input.parametros);
    this.props.metas = completarMetas(input.metas);
    if (input.status) this.props.status = input.status;
    this.props.atualizadoEm = new Date();
  }

  estaAtivo(): boolean {
    return this.props.status === StatusRecurso.ATIVO;
  }

  get idCentroTrabalho(): string {
    return this.props.idCentroTrabalho;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get status(): StatusRecurso {
    return this.props.status;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
  get calendarioId(): string {
    return this.props.calendarioId;
  }
  get vinculos(): VinculosCentroTrabalho {
    return { ...this.props.vinculos };
  }
  get parametros(): ParametrosCentroTrabalho {
    return { ...this.props.parametros };
  }
  get metas(): MetasCentroTrabalho {
    return { ...this.props.metas };
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}

function completarVinculos(
  parcial?: Parcial<VinculosCentroTrabalho> | undefined,
): VinculosCentroTrabalho {
  return {
    grupoMaquinaId: parcial?.grupoMaquinaId ?? null,
    tipoCausaId: parcial?.tipoCausaId ?? null,
    tipoParadaId: parcial?.tipoParadaId ?? null,
    tipoRecusaId: parcial?.tipoRecusaId ?? null,
    tipoRefugoId: parcial?.tipoRefugoId ?? null,
  };
}

function completarParametros(
  parcial?: Parcial<ParametrosCentroTrabalho> | undefined,
): ParametrosCentroTrabalho {
  // Regra 3 do RN: tratamento de tempo é obrigatório. Um valor indefinido não
  // chega ao banco — cai no default FIXO, como no legado.
  const tratamentoTempo = parcial?.tratamentoTempo ?? TratamentoTempo.FIXO;
  if (!Object.values(TratamentoTempo).includes(tratamentoTempo)) {
    throw new Error('Tratamento de Tempo inválido.');
  }

  const tempoParadaPadraoMinutos = parcial?.tempoParadaPadraoMinutos ?? 0;
  if (tempoParadaPadraoMinutos < 0) {
    throw new Error('Tempo de parada padrão não pode ser negativo.');
  }

  return {
    controlaMaoObra: parcial?.controlaMaoObra ?? false,
    preparacao: parcial?.preparacao ?? false,
    operacaoBaixada: parcial?.operacaoBaixada ?? null,
    tempoParadaPadraoMinutos,
    tratamentoTempo,
    tratamentoTempoLote: parcial?.tratamentoTempoLote ?? null,
    tipoUnidadeMedida: parcial?.tipoUnidadeMedida ?? TipoUnidadeMedida.UNIDADE,
  };
}

function completarMetas(parcial?: Parcial<MetasCentroTrabalho> | undefined): MetasCentroTrabalho {
  const custoMaquinaHora = parcial?.custoMaquinaHora ?? 0;
  // Regra 4 do RN, mensagem preservada (inclusive o "Conside" do original).
  if (custoMaquinaHora < 0) {
    throw new Error('Custo da Máquina por hora é inválido. Conside valores não negativos.');
  }

  return {
    metaDispTurno: parcial?.metaDispTurno ?? null,
    metaDesempTurno: parcial?.metaDesempTurno ?? null,
    metaQualiTurno: parcial?.metaQualiTurno ?? null,
    metaOeeTurno: parcial?.metaOeeTurno ?? null,
    custoMaquinaHora,
  };
}
