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
    const agora = new Date();
    return new Estabelecimento({
      idEstabelecimento: input.idEstabelecimento,
      descricao: Estabelecimento.exigirDescricao(input.descricao),
      status: StatusRecurso.ATIVO,
      recursos: Estabelecimento.completarRecursos(input.recursos),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  /** Invariante da descrição — a mesma na criação e na edição. */
  private static exigirDescricao(bruto: string): string {
    const descricao = (bruto ?? '').trim();
    if (descricao.length < 2) {
      throw new Error('A descrição do estabelecimento deve ter ao menos 2 caracteres');
    }
    return descricao;
  }

  /** Recurso omitido é recurso desligado — nunca fica indefinido. */
  private static completarRecursos(
    parcial?: { [K in keyof RecursosEstabelecimento]?: StatusRecurso | undefined } | undefined,
  ): RecursosEstabelecimento {
    return {
      impressoras: parcial?.impressoras ?? StatusRecurso.INATIVO,
      coletores: parcial?.coletores ?? StatusRecurso.INATIVO,
      checklist: parcial?.checklist ?? StatusRecurso.INATIVO,
      manufatura: parcial?.manufatura ?? StatusRecurso.INATIVO,
    };
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

  /**
   * Edita os dados cadastrais. O conjunto de recursos é substituído por
   * inteiro (recurso omitido → INATIVO), e não mesclado: o PUT descreve o
   * estado final, então desmarcar um módulo na tela precisa desligá-lo de fato.
   *
   * `status` não entra aqui de propósito — ativar/inativar é transição de ciclo
   * de vida e tem seus próprios métodos.
   */
  alterar(input: {
    descricao: string;
    recursos?: { [K in keyof RecursosEstabelecimento]?: StatusRecurso | undefined } | undefined;
  }): void {
    this.props.descricao = Estabelecimento.exigirDescricao(input.descricao);
    this.props.recursos = Estabelecimento.completarRecursos(input.recursos);
    this.props.atualizadoEm = new Date();
  }

  alterarRecurso(recurso: keyof RecursosEstabelecimento, status: StatusRecurso): void {
    this.props.recursos[recurso] = status;
    this.props.atualizadoEm = new Date();
  }
}
