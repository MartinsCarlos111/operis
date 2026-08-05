import type { OrigemOrdemProducao, ModoDistribuicaoOrdem, StatusOrdemProducao, TipoUnidadeMedida } from '../../domain/entities/ordem-producao.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';
import { OrdemProducao } from '../../domain/entities/ordem-producao.js';
import type { CriterioOrdemProducao, OrdemProducaoRepository } from '../../domain/repositories/ordem-producao.repositories.js';
import { OrdemProducaoDuplicadaError, OrdemProducaoNaoEncontradaError } from '../../domain/exceptions/ordem-producao.errors.js';
import { paraOrdemProducaoDTO, type ListaPaginadaDTO, type OrdemProducaoDTO } from '../dtos/manufatura.dtos.js';

export interface EntradaOrdemProducao {
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
  liberacaoEm?: string | null | undefined;
  inicioPlanejado?: string | null | undefined;
  fimPlanejado?: string | null | undefined;
  encerraEm?: string | null | undefined;
  planoProducaoId?: string | null | undefined;
  ordemPaiId?: string | null | undefined;
  ordemSequenciaId?: string | null | undefined;
}

function data(value?: string | null): Date | null | undefined {
  return value === undefined ? undefined : value === null ? null : new Date(value);
}

export class CriarOrdemProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository, private readonly estabelecimentos: VerificadorEstabelecimento, private readonly ids: GeradorId) {}

  async executar(input: EntradaOrdemProducao): Promise<OrdemProducaoDTO> {
    if (!(await this.estabelecimentos.estaAtivo(input.estabelecimentoId))) throw new Error('Estabelecimento inativo.');
    if (!(await this.estabelecimentos.temManufatura(input.estabelecimentoId))) throw new Error('Estabelecimento não possui o produto manufatura.');
    const existente = await this.ordens.buscarPorIdentidade(input.codigo.trim(), input.identificador.trim());
    if (existente) throw new OrdemProducaoDuplicadaError(input.codigo, input.identificador);
    const liberacaoEm = data(input.liberacaoEm);
    const ordem = OrdemProducao.criar({
      ...input,
      idOrdemProducao: this.ids.gerar(),
      origem: input.origem ?? 'OCTOPUS',
      status: input.status ?? (liberacaoEm && liberacaoEm > new Date() ? 'NAO_LIBERADA' : 'LIBERADA'),
      liberacaoEm,
      inicioPlanejado: data(input.inicioPlanejado),
      fimPlanejado: data(input.fimPlanejado),
      encerraEm: data(input.encerraEm),
    });
    await this.ordens.salvar(ordem);
    return paraOrdemProducaoDTO(ordem);
  }
}

export class BuscarOrdemProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository) {}
  async executar(input: { id: string; estabelecimentoId: string }): Promise<OrdemProducaoDTO> {
    const ordem = await this.ordens.buscarPorId(input.id, input.estabelecimentoId);
    if (!ordem) throw new OrdemProducaoNaoEncontradaError(input.id);
    return paraOrdemProducaoDTO(ordem);
  }
}

export class ListarOrdensProducaoUseCase {
  constructor(private readonly ordens: OrdemProducaoRepository) {}
  async executar(criterio: CriterioOrdemProducao): Promise<ListaPaginadaDTO<OrdemProducaoDTO>> {
    const [itens, count] = await Promise.all([this.ordens.listar(criterio), this.ordens.contar(criterio)]);
    return { count, model: itens.map(paraOrdemProducaoDTO) };
  }
}
