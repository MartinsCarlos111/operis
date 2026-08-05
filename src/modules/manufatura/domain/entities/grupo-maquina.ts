import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { exigirTexto } from './calendario.js';

/** ex-EnumRegraDespacho. Era string livre no legado. */
export const RegraDespacho = {
  MENOR_OPERACAO: 'MENOR_OPERACAO',
  DATA_ENTREGA: 'DATA_ENTREGA',
  PRIORIDADE: 'PRIORIDADE',
  CODIGO_REDUTOR: 'CODIGO_REDUTOR',
} as const;

export type RegraDespacho = (typeof RegraDespacho)[keyof typeof RegraDespacho];

interface GrupoMaquinaProps {
  idGrupoMaquina: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  regraDespacho: RegraDespacho;
  estabelecimentoId: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Grupo de máquina (migrado de Octopus `GrupoMaquina`). Agrupa centros de
 * trabalho equivalentes; a regra de despacho orienta o sequenciamento.
 */
export class GrupoMaquina {
  private constructor(private props: GrupoMaquinaProps) {}

  static criar(input: {
    idGrupoMaquina: string;
    codigo: string;
    descricao: string;
    regraDespacho?: RegraDespacho | undefined;
    estabelecimentoId: string;
  }): GrupoMaquina {
    const agora = new Date();
    return new GrupoMaquina({
      idGrupoMaquina: input.idGrupoMaquina,
      codigo: exigirTexto(input.codigo, 'Código do Grupo de Máquina não pode estar em branco'),
      descricao: exigirTexto(
        input.descricao,
        'Descrição do Grupo de Máquina não pode estar em branco',
      ),
      status: StatusRecurso.ATIVO,
      regraDespacho: input.regraDespacho ?? RegraDespacho.DATA_ENTREGA,
      estabelecimentoId: input.estabelecimentoId,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: GrupoMaquinaProps): GrupoMaquina {
    return new GrupoMaquina(props);
  }

  alterar(input: {
    codigo: string;
    descricao: string;
    regraDespacho?: RegraDespacho | undefined;
    status?: StatusRecurso | undefined;
  }): void {
    this.props.codigo = exigirTexto(
      input.codigo,
      'Código do Grupo de Máquina não pode estar em branco',
    );
    this.props.descricao = exigirTexto(
      input.descricao,
      'Descrição do Grupo de Máquina não pode estar em branco',
    );
    if (input.regraDespacho) this.props.regraDespacho = input.regraDespacho;
    if (input.status) this.props.status = input.status;
    this.props.atualizadoEm = new Date();
  }

  get idGrupoMaquina(): string {
    return this.props.idGrupoMaquina;
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
  get regraDespacho(): RegraDespacho {
    return this.props.regraDespacho;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
