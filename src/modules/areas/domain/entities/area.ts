interface AreaProps {
  idArea: string;
  codigo: string;
  descricao: string;
  estabelecimentoId: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Área de um estabelecimento (setor/local). Raiz de agregado.
 *
 * Migrada de Octopus `Area` + `AreaRN.ValidarArea`. As invariantes de forma
 * (código e descrição obrigatórios, sem espaços em branco) vivem aqui; as
 * regras que dependem de outros dados — estabelecimento ativo, código único —
 * ficam nos use-cases, pois precisam de repositórios (como no AreaRN original).
 *
 * `criar` gera uma nova área; `restaurar` reconstrói uma vinda da persistência.
 */
export class Area {
  private constructor(private props: AreaProps) {}

  static criar(input: {
    idArea: string;
    codigo: string;
    descricao: string;
    estabelecimentoId: string;
  }): Area {
    const codigo = Area.exigirTexto(input.codigo, 'Código da Área não pode estar em branco');
    const descricao = Area.exigirTexto(
      input.descricao,
      'Descrição da Área não pode estar em branco',
    );
    const agora = new Date();
    return new Area({
      idArea: input.idArea,
      codigo,
      descricao,
      estabelecimentoId: input.estabelecimentoId,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: AreaProps): Area {
    return new Area(props);
  }

  /**
   * Aplica os campos editáveis (paridade com AreaRN.EditarArea, que valida os
   * mesmos campos e atualiza dtAtualizacao). Código é editável no legado, mas
   * segue sujeito à unicidade verificada no use-case.
   */
  alterar(input: { codigo: string; descricao: string }): void {
    this.props.codigo = Area.exigirTexto(input.codigo, 'Código da Área não pode estar em branco');
    this.props.descricao = Area.exigirTexto(
      input.descricao,
      'Descrição da Área não pode estar em branco',
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

  get idArea(): string {
    return this.props.idArea;
  }

  get codigo(): string {
    return this.props.codigo;
  }

  get descricao(): string {
    return this.props.descricao;
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
