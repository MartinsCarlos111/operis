interface CentroTrabalhoItemProps {
  idCentroTrabalhoItem: string;
  itemId: string;
  centroTrabalhoId: string;
  cicloProdutivoHora: number | null;
  cicloProdutivoPecaSegundos: number | null;
  tempoPreparacaoSegundos: number | null;
  fatorRefugo: number | null;
  qtdRefugo: number | null;
  qtdPerda: number | null;
  apontarPreparacao: number | null;
  tempoMaquinaSegundos: number | null;
  loteMultiplo: number | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface AtributosCentroTrabalhoItem {
  cicloProdutivoHora?: number | null | undefined;
  cicloProdutivoPecaSegundos?: number | null | undefined;
  tempoPreparacaoSegundos?: number | null | undefined;
  fatorRefugo?: number | null | undefined;
  qtdRefugo?: number | null | undefined;
  qtdPerda?: number | null | undefined;
  apontarPreparacao?: number | null | undefined;
  tempoMaquinaSegundos?: number | null | undefined;
  loteMultiplo?: number | null | undefined;
  ativo?: boolean | undefined;
}

/**
 * Vínculo Item × Centro de Trabalho (migrado de Octopus `CentroTrabalhoItem`).
 * O par item/centro é imutável após a criação — para trocar, exclui e recria
 * (mesma regra do legado: `CdItem`/`CdCentroTrabalho` bloqueados na edição).
 */
export class CentroTrabalhoItem {
  private constructor(private props: CentroTrabalhoItemProps) {}

  static criar(
    input: {
      idCentroTrabalhoItem: string;
      itemId: string;
      centroTrabalhoId: string;
    } & AtributosCentroTrabalhoItem,
  ): CentroTrabalhoItem {
    const agora = new Date();
    return new CentroTrabalhoItem({
      idCentroTrabalhoItem: input.idCentroTrabalhoItem,
      itemId: input.itemId,
      centroTrabalhoId: input.centroTrabalhoId,
      cicloProdutivoHora: input.cicloProdutivoHora ?? null,
      cicloProdutivoPecaSegundos: input.cicloProdutivoPecaSegundos ?? 0,
      tempoPreparacaoSegundos: input.tempoPreparacaoSegundos ?? null,
      fatorRefugo: input.fatorRefugo ?? null,
      qtdRefugo: input.qtdRefugo ?? null,
      qtdPerda: input.qtdPerda ?? null,
      apontarPreparacao: input.apontarPreparacao ?? null,
      tempoMaquinaSegundos: input.tempoMaquinaSegundos ?? null,
      loteMultiplo: input.loteMultiplo ?? null,
      ativo: input.ativo ?? true,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: CentroTrabalhoItemProps): CentroTrabalhoItem {
    return new CentroTrabalhoItem(props);
  }

  /** Não altera itemId/centroTrabalhoId — paridade com o bloqueio do legado. */
  alterar(input: AtributosCentroTrabalhoItem): void {
    if (input.cicloProdutivoHora !== undefined) this.props.cicloProdutivoHora = input.cicloProdutivoHora;
    if (input.cicloProdutivoPecaSegundos !== undefined)
      this.props.cicloProdutivoPecaSegundos = input.cicloProdutivoPecaSegundos;
    if (input.tempoPreparacaoSegundos !== undefined)
      this.props.tempoPreparacaoSegundos = input.tempoPreparacaoSegundos;
    if (input.fatorRefugo !== undefined) this.props.fatorRefugo = input.fatorRefugo;
    if (input.qtdRefugo !== undefined) this.props.qtdRefugo = input.qtdRefugo;
    if (input.qtdPerda !== undefined) this.props.qtdPerda = input.qtdPerda;
    if (input.apontarPreparacao !== undefined) this.props.apontarPreparacao = input.apontarPreparacao;
    if (input.tempoMaquinaSegundos !== undefined) this.props.tempoMaquinaSegundos = input.tempoMaquinaSegundos;
    if (input.loteMultiplo !== undefined) this.props.loteMultiplo = input.loteMultiplo;
    if (input.ativo !== undefined) this.props.ativo = input.ativo;
    this.props.atualizadoEm = new Date();
  }

  get idCentroTrabalhoItem(): string {
    return this.props.idCentroTrabalhoItem;
  }
  get itemId(): string {
    return this.props.itemId;
  }
  get centroTrabalhoId(): string {
    return this.props.centroTrabalhoId;
  }
  get cicloProdutivoHora(): number | null {
    return this.props.cicloProdutivoHora;
  }
  get cicloProdutivoPecaSegundos(): number | null {
    return this.props.cicloProdutivoPecaSegundos;
  }
  get tempoPreparacaoSegundos(): number | null {
    return this.props.tempoPreparacaoSegundos;
  }
  get fatorRefugo(): number | null {
    return this.props.fatorRefugo;
  }
  get qtdRefugo(): number | null {
    return this.props.qtdRefugo;
  }
  get qtdPerda(): number | null {
    return this.props.qtdPerda;
  }
  get apontarPreparacao(): number | null {
    return this.props.apontarPreparacao;
  }
  get tempoMaquinaSegundos(): number | null {
    return this.props.tempoMaquinaSegundos;
  }
  get loteMultiplo(): number | null {
    return this.props.loteMultiplo;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
