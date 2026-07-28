import { StatusRecurso } from '@shared/domain/status-recurso.js';

interface RegraNotificacaoProps {
  idRegraNotificacao: string;
  codigo: string;
  descricao: string;
  destinatarios: string;
  produto: string;
  tabela: string;
  conteudo: string;
  status: StatusRecurso;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Regra de notificação — raiz de agregado. Migrada de Octopus
 * `RegraNotificacao` + `RegraNotificacaoRN.ValidarRegraNotificacao`: código,
 * descrição, tabela e conteúdo são obrigatórios (invariantes de forma). A
 * unicidade do código é verificada no use-case (depende do repositório).
 * `destinatarios`/`produto` são opcionais no legado (texto livre).
 */
export class RegraNotificacao {
  private constructor(private props: RegraNotificacaoProps) {}

  static criar(input: {
    idRegraNotificacao: string;
    codigo: string;
    descricao: string;
    tabela: string;
    conteudo: string;
    destinatarios?: string | undefined;
    produto?: string | undefined;
    status?: StatusRecurso | undefined;
  }): RegraNotificacao {
    const agora = new Date();
    return new RegraNotificacao({
      idRegraNotificacao: input.idRegraNotificacao,
      codigo: RegraNotificacao.exigir(input.codigo, 'Código da Regra Notificação não pode estar em branco.'),
      descricao: RegraNotificacao.exigir(
        input.descricao,
        'Descrição da Regra Notificação não pode estar em branco.',
      ),
      tabela: RegraNotificacao.exigir(input.tabela, 'Tabela da Regra Notificação não pode estar em branco.'),
      conteudo: RegraNotificacao.exigir(
        input.conteudo,
        'Descrição do Conteúdo da Notificação não pode estar em branco.',
      ),
      destinatarios: (input.destinatarios ?? '').trim(),
      produto: (input.produto ?? '').trim(),
      status: input.status ?? StatusRecurso.ATIVO,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: RegraNotificacaoProps): RegraNotificacao {
    return new RegraNotificacao(props);
  }

  /** Aplica campos editáveis (paridade com RegraNotificacaoRN.EditarRegraNotificacao). */
  alterar(input: {
    codigo: string;
    descricao: string;
    tabela: string;
    conteudo: string;
    destinatarios?: string | undefined;
    produto?: string | undefined;
    status?: StatusRecurso | undefined;
  }): void {
    this.props.codigo = RegraNotificacao.exigir(
      input.codigo,
      'Código da Regra Notificação não pode estar em branco.',
    );
    this.props.descricao = RegraNotificacao.exigir(
      input.descricao,
      'Descrição da Regra Notificação não pode estar em branco.',
    );
    this.props.tabela = RegraNotificacao.exigir(
      input.tabela,
      'Tabela da Regra Notificação não pode estar em branco.',
    );
    this.props.conteudo = RegraNotificacao.exigir(
      input.conteudo,
      'Descrição do Conteúdo da Notificação não pode estar em branco.',
    );
    if (input.destinatarios !== undefined) this.props.destinatarios = input.destinatarios.trim();
    if (input.produto !== undefined) this.props.produto = input.produto.trim();
    if (input.status !== undefined) this.props.status = input.status;
    this.props.atualizadoEm = new Date();
  }

  private static exigir(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) {
      throw new Error(mensagem);
    }
    return limpo;
  }

  get idRegraNotificacao(): string {
    return this.props.idRegraNotificacao;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get destinatarios(): string {
    return this.props.destinatarios;
  }
  get produto(): string {
    return this.props.produto;
  }
  get tabela(): string {
    return this.props.tabela;
  }
  get conteudo(): string {
    return this.props.conteudo;
  }
  get status(): StatusRecurso {
    return this.props.status;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
