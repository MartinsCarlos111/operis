interface VariavelLayoutProps {
  idVariavel: string;
  codigo: string;
  descricao: string;
  campoEtiquetaManufatura: string;
  campoEtiquetaColetores: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Variável de layout de etiqueta. Raiz de agregado. Migrada de Octopus
 * `VariavelLayout` + `ValidarVariavelLayout`: código e descrição obrigatórios;
 * unicidade do código verificada no use-case.
 */
export class VariavelLayout {
  private constructor(private props: VariavelLayoutProps) {}

  static criar(input: {
    idVariavel: string;
    codigo: string;
    descricao: string;
    campoEtiquetaManufatura?: string | undefined;
    campoEtiquetaColetores?: string | undefined;
  }): VariavelLayout {
    const agora = new Date();
    return new VariavelLayout({
      idVariavel: input.idVariavel,
      codigo: VariavelLayout.exigir(input.codigo, 'Código da Variável não pode estar em branco'),
      descricao: VariavelLayout.exigir(
        input.descricao,
        'Descrição da Variável não pode estar em branco',
      ),
      campoEtiquetaManufatura: (input.campoEtiquetaManufatura ?? '').trim(),
      campoEtiquetaColetores: (input.campoEtiquetaColetores ?? '').trim(),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: VariavelLayoutProps): VariavelLayout {
    return new VariavelLayout(props);
  }

  alterar(input: {
    codigo: string;
    descricao: string;
    campoEtiquetaManufatura?: string | undefined;
    campoEtiquetaColetores?: string | undefined;
  }): void {
    this.props.codigo = VariavelLayout.exigir(
      input.codigo,
      'Código da Variável não pode estar em branco',
    );
    this.props.descricao = VariavelLayout.exigir(
      input.descricao,
      'Descrição da Variável não pode estar em branco',
    );
    if (input.campoEtiquetaManufatura !== undefined)
      this.props.campoEtiquetaManufatura = input.campoEtiquetaManufatura.trim();
    if (input.campoEtiquetaColetores !== undefined)
      this.props.campoEtiquetaColetores = input.campoEtiquetaColetores.trim();
    this.props.atualizadoEm = new Date();
  }

  private static exigir(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) {
      throw new Error(mensagem);
    }
    return limpo;
  }

  get idVariavel(): string {
    return this.props.idVariavel;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get campoEtiquetaManufatura(): string {
    return this.props.campoEtiquetaManufatura;
  }
  get campoEtiquetaColetores(): string {
    return this.props.campoEtiquetaColetores;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
