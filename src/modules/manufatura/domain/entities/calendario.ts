import { StatusRecurso } from '@shared/domain/status-recurso.js';

interface CalendarioProps {
  idCalendario: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  estabelecimentoId: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Calendário de produção (migrado de Octopus `Calendario`). Raiz de agregado.
 *
 * As invariantes de forma (código e descrição obrigatórios) vivem aqui; a
 * unicidade do código e a validação do estabelecimento ficam nos use-cases,
 * que têm repositórios — mesma divisão adotada em Área.
 */
export class Calendario {
  private constructor(private props: CalendarioProps) {}

  static criar(input: {
    idCalendario: string;
    codigo: string;
    descricao: string;
    estabelecimentoId: string;
  }): Calendario {
    const agora = new Date();
    return new Calendario({
      idCalendario: input.idCalendario,
      codigo: exigirTexto(input.codigo, 'Código do Calendário não pode estar em branco'),
      descricao: exigirTexto(input.descricao, 'Descrição do Calendário não pode estar em branco'),
      status: StatusRecurso.ATIVO,
      estabelecimentoId: input.estabelecimentoId,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: CalendarioProps): Calendario {
    return new Calendario(props);
  }

  alterar(input: { codigo: string; descricao: string; status?: StatusRecurso | undefined }): void {
    this.props.codigo = exigirTexto(input.codigo, 'Código do Calendário não pode estar em branco');
    this.props.descricao = exigirTexto(
      input.descricao,
      'Descrição do Calendário não pode estar em branco',
    );
    if (input.status) this.props.status = input.status;
    this.props.atualizadoEm = new Date();
  }

  estaAtivo(): boolean {
    return this.props.status === StatusRecurso.ATIVO;
  }

  get idCalendario(): string {
    return this.props.idCalendario;
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
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}

/** Invariante compartilhada pelos cadastros de manufatura. */
export function exigirTexto(valor: string, mensagem: string): string {
  const limpo = (valor ?? '').trim();
  if (limpo.length === 0) {
    throw new Error(mensagem);
  }
  return limpo;
}
