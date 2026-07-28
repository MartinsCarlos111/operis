interface EstabelecimentoImpressoraProps {
  estabelecimentoId: string;
  impressoraId: string;
  criadoEm: Date;
}

/**
 * Vínculo N:N estabelecimento ↔ impressora (migrado de Octopus
 * `EstabelecimentoImpressora`). Junção pura: identidade é o par
 * (estabelecimentoId, impressoraId). As regras (existência de ambos, par não
 * duplicado) vivem no use-case — dependem de repositórios/gateways, como no
 * EstabelecimentoImpressoraRN.
 */
export class EstabelecimentoImpressora {
  private constructor(private props: EstabelecimentoImpressoraProps) {}

  static criar(input: { estabelecimentoId: string; impressoraId: string }): EstabelecimentoImpressora {
    return new EstabelecimentoImpressora({
      estabelecimentoId: input.estabelecimentoId,
      impressoraId: input.impressoraId,
      criadoEm: new Date(),
    });
  }

  static restaurar(props: EstabelecimentoImpressoraProps): EstabelecimentoImpressora {
    return new EstabelecimentoImpressora(props);
  }

  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }

  get impressoraId(): string {
    return this.props.impressoraId;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }
}
