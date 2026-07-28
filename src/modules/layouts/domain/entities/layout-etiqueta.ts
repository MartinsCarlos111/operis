interface LayoutEtiquetaProps {
  idLayout: string;
  codigo: string;
  descricao: string;
  zpl: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Layout de etiqueta. Raiz de agregado. Migrado de Octopus `LayoutEtiqueta`:
 * guarda o template ZPL enviado à impressora Zebra. Código e descrição
 * obrigatórios; unicidade do código verificada no use-case.
 */
export class LayoutEtiqueta {
  private constructor(private props: LayoutEtiquetaProps) {}

  static criar(input: {
    idLayout: string;
    codigo: string;
    descricao: string;
    zpl?: string | undefined;
  }): LayoutEtiqueta {
    const agora = new Date();
    return new LayoutEtiqueta({
      idLayout: input.idLayout,
      codigo: LayoutEtiqueta.exigir(input.codigo, 'Código do Layout não pode estar em branco'),
      descricao: LayoutEtiqueta.exigir(
        input.descricao,
        'Descrição do Layout não pode estar em branco',
      ),
      zpl: (input.zpl ?? '').trim(),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: LayoutEtiquetaProps): LayoutEtiqueta {
    return new LayoutEtiqueta(props);
  }

  alterar(input: { codigo: string; descricao: string; zpl?: string | undefined }): void {
    this.props.codigo = LayoutEtiqueta.exigir(
      input.codigo,
      'Código do Layout não pode estar em branco',
    );
    this.props.descricao = LayoutEtiqueta.exigir(
      input.descricao,
      'Descrição do Layout não pode estar em branco',
    );
    if (input.zpl !== undefined) this.props.zpl = input.zpl.trim();
    this.props.atualizadoEm = new Date();
  }

  private static exigir(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) {
      throw new Error(mensagem);
    }
    return limpo;
  }

  get idLayout(): string {
    return this.props.idLayout;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get zpl(): string {
    return this.props.zpl;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
