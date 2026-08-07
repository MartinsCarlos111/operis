import { Etiqueta, type MotivoGeracaoEtiqueta, type StatusEtiqueta } from '../../domain/entities/etiqueta.js';
import { Rastreabilidade } from '../../domain/entities/rastreabilidade.js';
import type {
  CriterioListagemEtiqueta,
  EtiquetaRepository,
  RastreabilidadeRepository,
} from '../../domain/repositories/etiqueta.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { AppError } from '@shared/errors/app-error.js';
import type { ListaPaginadaDTO } from '../dtos/manufatura.dtos.js';

export class EtiquetaNaoEncontradaError extends AppError {
  readonly code = 'ETIQUETA_NAO_ENCONTRADA';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Etiqueta '${id}' não encontrada.`);
  }
}

export class EtiquetaJaExisteError extends AppError {
  readonly code = 'ETIQUETA_JA_EXISTE';
  readonly httpStatus = 409;
  constructor(codigoBarras: string) {
    super(`Etiqueta com código de barras '${codigoBarras}' já existe.`);
  }
}

export interface EtiquetaDTO {
  idEtiqueta: string;
  codigoBarras: string;
  sequencial: number;
  motivoGeracao: MotivoGeracaoEtiqueta;
  status: StatusEtiqueta;
  quantidade: number;
  unidadeMedida: string;
  ordemProducaoId: string;
  movimentoId: string | null;
  layoutId: string | null;
  impressoEm: string | null;
  baixadoEm: string | null;
  usuarioId: string;
  observacao: string | null;
}

export function paraEtiquetaDTO(e: Etiqueta): EtiquetaDTO {
  return {
    idEtiqueta: e.idEtiqueta,
    codigoBarras: e.codigoBarras,
    sequencial: e.sequencial,
    motivoGeracao: e.motivoGeracao,
    status: e.status,
    quantidade: e.quantidade,
    unidadeMedida: e.unidadeMedida,
    ordemProducaoId: e.ordemProducaoId,
    movimentoId: e.movimentoId,
    layoutId: e.layoutId,
    impressoEm: e.impressoEm ? e.impressoEm.toISOString() : null,
    baixadoEm: e.baixadoEm ? e.baixadoEm.toISOString() : null,
    usuarioId: e.usuarioId,
    observacao: e.observacao,
  };
}

export interface RastreabilidadeDTO {
  idRastreabilidade: string;
  etiquetaId: string;
  ordemProducaoId: string;
  movimentoId: string | null;
  itemCodigo: string;
  itemDescricao: string | null;
  lote: string | null;
  serie: string | null;
  quantidadeProduzida: number;
  quantidadeRefugo: number;
}

export function paraRastreabilidadeDTO(r: Rastreabilidade): RastreabilidadeDTO {
  return {
    idRastreabilidade: r.idRastreabilidade,
    etiquetaId: r.etiquetaId,
    ordemProducaoId: r.ordemProducaoId,
    movimentoId: r.movimentoId,
    itemCodigo: r.itemCodigo,
    itemDescricao: r.itemDescricao,
    lote: r.lote,
    serie: r.serie,
    quantidadeProduzida: r.quantidadeProduzida,
    quantidadeRefugo: r.quantidadeRefugo,
  };
}

export interface EntradaImprimirEtiqueta {
  estabelecimentoId: string;
  ordemProducaoId: string;
  movimentoId: string | null;
  quantidade: number;
  unidadeMedida: string;
  usuarioId: string;
  layoutId?: string | null | undefined;
  itemCodigo?: string | undefined;
  itemDescricao?: string | null | undefined;
  lote?: string | null | undefined;
  serie?: string | null | undefined;
  observacao?: string | null | undefined;
}

/**
 * Imprime etiqueta na sequência de uma OP — paridade com
 * `EtiquetaManufaturaController.ImprimirEtiqueta` + fluxo de `RegistrarMovimento`
 * que gera etiqueta em cada reporte. Cria `Etiqueta` + `Rastreabilidade`
 * associando ao movimento que a gerou.
 */
export class ImprimirEtiquetaUseCase {
  constructor(
    private readonly etiquetas: EtiquetaRepository,
    private readonly rastreabilidades: RastreabilidadeRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaImprimirEtiqueta): Promise<EtiquetaDTO> {
    const sequencial = await this.etiquetas.proximoSequencial(input.ordemProducaoId);
    const codigoBarras = `${input.ordemProducaoId}-${String(sequencial).padStart(6, '0')}`;
    const conflito = await this.etiquetas.buscarPorCodigo(codigoBarras);
    if (conflito) throw new EtiquetaJaExisteError(codigoBarras);

    const etiqueta = Etiqueta.criar({
      idEtiqueta: this.ids.gerar(),
      sequencial,
      codigoBarras,
      quantidade: input.quantidade,
      // cast seguro: schema prisma valida os valores reais.
      unidadeMedida: input.unidadeMedida as never,
      ordemProducaoId: input.ordemProducaoId,
      movimentoId: input.movimentoId,
      layoutId: input.layoutId,
      usuarioId: input.usuarioId,
      estabelecimentoId: input.estabelecimentoId,
      observacao: input.observacao,
      motivoGeracao: 'REPORTE' as MotivoGeracaoEtiqueta,
    });
    etiqueta.marcarImpressa();
    await this.etiquetas.salvar(etiqueta);

    // Rastreabilidade opcional — só quando item for informado (paridade com
    // reporte do terminalReporteEtiqueta).
    if (input.itemCodigo) {
      const rastro = Rastreabilidade.criar({
        idRastreabilidade: this.ids.gerar(),
        etiquetaId: etiqueta.idEtiqueta,
        ordemProducaoId: input.ordemProducaoId,
        movimentoId: input.movimentoId,
        itemCodigo: input.itemCodigo,
        itemDescricao: input.itemDescricao,
        lote: input.lote,
        serie: input.serie,
        quantidadeProduzida: input.quantidade,
      });
      await this.rastreabilidades.salvar(rastro);
    }

    return paraEtiquetaDTO(etiqueta);
  }
}

export class CancelarEtiquetaUseCase {
  constructor(private readonly etiquetas: EtiquetaRepository) {}

  async executar(input: { idEtiqueta: string; estabelecimentoId: string; observacao?: string | undefined }): Promise<EtiquetaDTO> {
    const etiqueta = await this.etiquetas.buscarPorId(input.idEtiqueta, input.estabelecimentoId);
    if (!etiqueta) throw new EtiquetaNaoEncontradaError(input.idEtiqueta);
    etiqueta.cancelar(input.observacao ?? null);
    await this.etiquetas.salvar(etiqueta);
    return paraEtiquetaDTO(etiqueta);
  }
}

export class ListarEtiquetasUseCase {
  constructor(private readonly etiquetas: EtiquetaRepository) {}

  async executar(criterio: CriterioListagemEtiqueta): Promise<ListaPaginadaDTO<EtiquetaDTO>> {
    const [itens, total] = await Promise.all([
      this.etiquetas.listar(criterio),
      this.etiquetas.contar(criterio),
    ]);
    return { model: itens.map(paraEtiquetaDTO), count: total };
  }
}

export class ListarRastreabilidadesUseCase {
  constructor(private readonly rastreabilidades: RastreabilidadeRepository) {}

  async executar(input: { ordemProducaoId: string }): Promise<RastreabilidadeDTO[]> {
    const itens = await this.rastreabilidades.listarPorOrdemProducao(input.ordemProducaoId);
    return itens.map(paraRastreabilidadeDTO);
  }
}

export class BuscarEtiquetaUseCase {
  constructor(private readonly etiquetas: EtiquetaRepository) {}

  async executar(input: { idEtiqueta: string; estabelecimentoId: string }): Promise<EtiquetaDTO> {
    const etiqueta = await this.etiquetas.buscarPorId(input.idEtiqueta, input.estabelecimentoId);
    if (!etiqueta) throw new EtiquetaNaoEncontradaError(input.idEtiqueta);
    return paraEtiquetaDTO(etiqueta);
  }
}