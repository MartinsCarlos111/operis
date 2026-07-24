import { StatusRecurso } from '@shared/domain/status-recurso.js';

/**
 * Recursos (módulos) que um estabelecimento pode ter ativos ou inativos.
 * Cada um é um StatusRecurso — enum autodocumentado em vez de boolean solto.
 */
export interface RecursosEstabelecimento {
  impressoras: StatusRecurso;
  coletores: StatusRecurso;
  checklist: StatusRecurso;
  manufatura: StatusRecurso;
}

interface EstabelecimentoProps {
  idEstabelecimento: string;
  descricao: string;
  status: StatusRecurso;
  recursos: RecursosEstabelecimento;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Estabelecimento — raiz de agregado. Controla o acesso aos seus recursos e
 * garante suas invariantes (descrição obrigatória). `criar` é para um novo
 * estabelecimento; `restaurar` reconstrói um vindo da persistência.
 */
export class Estabelecimento {
  private constructor(private props: EstabelecimentoProps) {}

  static criar(input: {
    idEstabelecimento: string;
    descricao: string;
    recursos?: { [K in keyof RecursosEstabelecimento]?: StatusRecurso | undefined } | undefined;
  }): Estabelecimento {
    const descricao = input.descricao.trim();
    if (descricao.length < 2) {
      throw new Error('A descrição do estabelecimento deve ter ao menos 2 caracteres');
    }
    const agora = new Date();
    return new Estabelecimento({
      idEstabelecimento: input.idEstabelecimento,
      descricao,
      status: StatusRecurso.ATIVO,
      recursos: {
        impressoras: input.recursos?.impressoras ?? StatusRecurso.INATIVO,
        coletores: input.recursos?.coletores ?? StatusRecurso.INATIVO,
        checklist: input.recursos?.checklist ?? StatusRecurso.INATIVO,
        manufatura: input.recursos?.manufatura ?? StatusRecurso.INATIVO,
      },
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: EstabelecimentoProps): Estabelecimento {
    return new Estabelecimento(props);
  }

  get idEstabelecimento(): string {
    return this.props.idEstabelecimento;
  }

  get descricao(): string {
    return this.props.descricao;
  }

  get status(): StatusRecurso {
    return this.props.status;
  }

  get recursos(): RecursosEstabelecimento {
    return { ...this.props.recursos };
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  estaAtivo(): boolean {
    return this.props.status === StatusRecurso.ATIVO;
  }

  inativar(): void {
    this.props.status = StatusRecurso.INATIVO;
    this.props.atualizadoEm = new Date();
  }

  ativar(): void {
    this.props.status = StatusRecurso.ATIVO;
    this.props.atualizadoEm = new Date();
  }

  alterarRecurso(recurso: keyof RecursosEstabelecimento, status: StatusRecurso): void {
    this.props.recursos[recurso] = status;
    this.props.atualizadoEm = new Date();
  }
}
