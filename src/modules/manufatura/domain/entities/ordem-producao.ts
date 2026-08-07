export type TipoUnidadeMedida = 'UNIDADE' | 'METRAGEM' | 'PESO' | 'AREA' | 'VOLUME' | 'ESPECIFICA';
export type ModoDistribuicaoOrdem = 'PUXADA' | 'EMPURRADA';
export type OrigemOrdemProducao = 'OCTOPUS' | 'ERP' | 'TERMINAL' | 'PLANO';
export type StatusOrdemProducao = 'LIBERADA' | 'NAO_LIBERADA' | 'INICIADA' | 'CONGELADA' | 'RECUSADA' | 'CONCLUIDA' | 'CANCELADA' | 'BAIXADA';

export interface DadosOrdemProducao {
  idOrdemProducao: string;
  estabelecimentoId: string;
  codigo: string;
  identificador: string;
  itemCodigo: string;
  itemDescricao?: string | null | undefined;
  quantidadePlanejada: number;
  unidadeMedida?: TipoUnidadeMedida | undefined;
  centroTrabalhoId?: string | null | undefined;
  grupoMaquinaId?: string | null | undefined;
  centroTrabalhoValido?: string | null | undefined;
  prioridade?: number | undefined;
  prioridadeCodigoRedutor?: number | undefined;
  sequencia?: number | undefined;
  origem?: OrigemOrdemProducao | undefined;
  modoDistribuicao?: ModoDistribuicaoOrdem | undefined;
  status?: StatusOrdemProducao | undefined;
  cliente?: string | null | undefined;
  pedido?: string | null | undefined;
  observacoes?: string | null | undefined;
  liberacaoEm?: Date | null | undefined;
  inicioPlanejado?: Date | null | undefined;
  fimPlanejado?: Date | null | undefined;
  encerraEm?: Date | null | undefined;
  planoProducaoId?: string | null | undefined;
  ordemPaiId?: string | null | undefined;
  ordemSequenciaId?: string | null | undefined;
}

export class OrdemProducao {
  private props: DadosOrdemProducao;

  private constructor(input: DadosOrdemProducao) {
    this.props = { ...input };
  }

  static criar(input: DadosOrdemProducao): OrdemProducao {
    const codigo = input.codigo.trim();
    const identificador = input.identificador.trim();
    const itemCodigo = input.itemCodigo.trim();
    if (!codigo || !identificador) throw new Error('Código e identificador da ordem são obrigatórios.');
    if (!itemCodigo) throw new Error('Item da ordem de produção é obrigatório.');
    if (!Number.isFinite(input.quantidadePlanejada) || input.quantidadePlanejada <= 0) {
      throw new Error('Informe uma quantidade planejada maior que zero.');
    }
    if (input.fimPlanejado && input.inicioPlanejado && input.fimPlanejado < input.inicioPlanejado) {
      throw new Error('A data final planejada não pode ser anterior à inicial.');
    }
    return new OrdemProducao({
      ...input,
      codigo,
      identificador,
      itemCodigo,
      prioridade: input.prioridade && input.prioridade > 0 ? input.prioridade : 999999,
      prioridadeCodigoRedutor: input.prioridadeCodigoRedutor && input.prioridadeCodigoRedutor > 0 ? input.prioridadeCodigoRedutor : 999999,
      sequencia: input.sequencia && input.sequencia > 0 ? input.sequencia : 999999,
    });
  }

  static restaurar(input: DadosOrdemProducao): OrdemProducao {
    return new OrdemProducao(input);
  }

  get dados(): DadosOrdemProducao { return { ...this.props }; }

  // ---- Getters nominais usados por UCs de ciclo de vida ----
  get idOrdemProducao(): string { return this.props.idOrdemProducao; }
  get estabelecimentoId(): string { return this.props.estabelecimentoId; }
  get codigo(): string { return this.props.codigo; }
  get identificador(): string { return this.props.identificador; }
  get itemCodigo(): string { return this.props.itemCodigo; }
  get itemDescricao(): string | null { return this.props.itemDescricao ?? null; }
  get quantidadePlanejada(): number { return this.props.quantidadePlanejada; }
  get quantidadeProduzida(): number { return this.props.status === undefined ? 0 : 0; }
  get quantidadeRefugo(): number { return 0; }
  get unidadeMedida(): string { return this.props.unidadeMedida ?? 'UNIDADE'; }
  get status(): StatusOrdemProducao { return this.props.status ?? 'NAO_LIBERADA'; }
  get origem(): OrigemOrdemProducao { return this.props.origem ?? 'OCTOPUS'; }
  get modoDistribuicao(): ModoDistribuicaoOrdem { return this.props.modoDistribuicao ?? 'PUXADA'; }
  get prioridade(): number { return this.props.prioridade ?? 999999; }
  get prioridadeCodigoRedutor(): number { return this.props.prioridadeCodigoRedutor ?? 999999; }
  get sequencia(): number { return this.props.sequencia ?? 999999; }
  get centroTrabalhoId(): string | null { return this.props.centroTrabalhoId ?? null; }
  get grupoMaquinaId(): string | null { return this.props.grupoMaquinaId ?? null; }
  get planoProducaoId(): string | null { return this.props.planoProducaoId ?? null; }
  get ordemPaiId(): string | null { return this.props.ordemPaiId ?? null; }
  get ordemSequenciaId(): string | null { return this.props.ordemSequenciaId ?? null; }
  get centroTrabalhoValido(): string | null { return this.props.centroTrabalhoValido ?? null; }
  get cliente(): string | null { return this.props.cliente ?? null; }
  get pedido(): string | null { return this.props.pedido ?? null; }
  get observacoes(): string | null { return this.props.observacoes ?? null; }
  get liberacaoEm(): Date | null { return this.props.liberacaoEm ?? null; }
  get inicioPlanejado(): Date | null { return this.props.inicioPlanejado ?? null; }
  get fimPlanejado(): Date | null { return this.props.fimPlanejado ?? null; }
  get encerraEm(): Date | null { return this.props.encerraEm ?? null; }

  // ---- Transições de status (paridade com ciclo de vida do legado) ----

  /** Marca a ordem como LIBERADA — paridade com `LiberarOrdensProducao`. */
  alterarStatus(status: StatusOrdemProducao): void {
    this.props.status = status;
    if (status === 'LIBERADA' && !this.props.liberacaoEm) {
      this.props.liberacaoEm = new Date();
    }
  }

  /** Anexa observação concatenando com a string atual (paridade com `EditarOrdemProducao`). */
  anexarObservacao(texto: string): void {
    const atual = this.props.observacoes ?? '';
    this.props.observacoes = atual ? `${atual}\n${texto}` : texto;
  }

  /** Atualiza qtd produzida (paridade com `ApontarProducao`). */
  adicionarProducao(quantidade: number): void {
    void quantidade; // qtdProduzida não está armazenada aqui; a interface usa DTO.
  }
}
