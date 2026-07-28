interface ImpressoraProps {
  idImpressora: string;
  codigo: string;
  descricao: string;
  endereco: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Impressora — recurso global do tenant. Raiz de agregado.
 *
 * Migrada de Octopus `Impressora` + `ImpressoraRN.ValidarImpressora`: código,
 * descrição e endereço são obrigatórios (invariantes de forma). A unicidade do
 * código é verificada no use-case (depende do repositório), como no RN.
 */
export class Impressora {
  private constructor(private props: ImpressoraProps) {}

  static criar(input: {
    idImpressora: string;
    codigo: string;
    descricao: string;
    endereco: string;
  }): Impressora {
    const agora = new Date();
    return new Impressora({
      idImpressora: input.idImpressora,
      codigo: Impressora.exigirTexto(input.codigo, 'Código da impressora é inválido.'),
      descricao: Impressora.exigirTexto(input.descricao, 'Descrição da impressora é inválida.'),
      endereco: Impressora.exigirTexto(input.endereco, 'Endereço da impressora é inválido.'),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: ImpressoraProps): Impressora {
    return new Impressora(props);
  }

  /** Aplica os campos editáveis (paridade com ImpressoraRN.EditarImpressora). */
  alterar(input: { codigo: string; descricao: string; endereco: string }): void {
    this.props.codigo = Impressora.exigirTexto(input.codigo, 'Código da impressora é inválido.');
    this.props.descricao = Impressora.exigirTexto(
      input.descricao,
      'Descrição da impressora é inválida.',
    );
    this.props.endereco = Impressora.exigirTexto(
      input.endereco,
      'Endereço da impressora é inválido.',
    );
    this.props.atualizadoEm = new Date();
  }

  private static exigirTexto(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) {
      throw new Error(mensagem);
    }
    return limpo;
  }

  get idImpressora(): string {
    return this.props.idImpressora;
  }

  get codigo(): string {
    return this.props.codigo;
  }

  get descricao(): string {
    return this.props.descricao;
  }

  get endereco(): string {
    return this.props.endereco;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
