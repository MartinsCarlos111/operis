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
  private constructor(private readonly props: DadosOrdemProducao) {}

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
}
