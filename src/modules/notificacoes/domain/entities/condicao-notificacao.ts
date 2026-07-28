interface CondicaoNotificacaoProps {
  idCondicaoNotificacao: string;
  regraNotificacaoId: string;
  campo: string;
  operador: string;
  valor: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Condição de uma regra de notificação (1:N). Migrada de Octopus
 * `CondicaoNotificacao`: (campo, operador/cdCondicao, valor) atrelada a uma
 * regra. Campo e operador são obrigatórios; valor pode ser vazio (ex.: testes
 * de nulidade).
 */
export class CondicaoNotificacao {
  private constructor(private props: CondicaoNotificacaoProps) {}

  static criar(input: {
    idCondicaoNotificacao: string;
    regraNotificacaoId: string;
    campo: string;
    operador: string;
    valor?: string | undefined;
  }): CondicaoNotificacao {
    const agora = new Date();
    return new CondicaoNotificacao({
      idCondicaoNotificacao: input.idCondicaoNotificacao,
      regraNotificacaoId: input.regraNotificacaoId,
      campo: CondicaoNotificacao.exigir(input.campo, 'Campo da condição não pode estar em branco.'),
      operador: CondicaoNotificacao.exigir(
        input.operador,
        'Operador da condição não pode estar em branco.',
      ),
      valor: (input.valor ?? '').trim(),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: CondicaoNotificacaoProps): CondicaoNotificacao {
    return new CondicaoNotificacao(props);
  }

  alterar(input: { campo: string; operador: string; valor?: string | undefined }): void {
    this.props.campo = CondicaoNotificacao.exigir(
      input.campo,
      'Campo da condição não pode estar em branco.',
    );
    this.props.operador = CondicaoNotificacao.exigir(
      input.operador,
      'Operador da condição não pode estar em branco.',
    );
    if (input.valor !== undefined) this.props.valor = input.valor.trim();
    this.props.atualizadoEm = new Date();
  }

  private static exigir(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) {
      throw new Error(mensagem);
    }
    return limpo;
  }

  get idCondicaoNotificacao(): string {
    return this.props.idCondicaoNotificacao;
  }
  get regraNotificacaoId(): string {
    return this.props.regraNotificacaoId;
  }
  get campo(): string {
    return this.props.campo;
  }
  get operador(): string {
    return this.props.operador;
  }
  get valor(): string {
    return this.props.valor;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
