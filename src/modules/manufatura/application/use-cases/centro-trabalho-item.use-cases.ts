import { CentroTrabalhoItem, type AtributosCentroTrabalhoItem } from '../../domain/entities/centro-trabalho-item.js';
import type {
  CentroTrabalhoItemRepository,
  CentroTrabalhoRepository,
  CriterioListagemCentroTrabalhoItem,
  ItemRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  CentroTrabalhoItemNaoEncontradoError,
  CentroTrabalhoNaoEncontradoError,
  ItemCentroTrabalhoJaRelacionadosError,
  ItemNaoEncontradoError,
} from '../../domain/exceptions/manufatura.errors.js';
import {
  paraCentroTrabalhoItemDTO,
  type CentroTrabalhoItemDTO,
  type ListaPaginadaDTO,
} from '../dtos/manufatura.dtos.js';

export interface EntradaCentroTrabalhoItem extends AtributosCentroTrabalhoItem {
  estabelecimentoId: string;
  itemId: string;
  centroTrabalhoId: string;
}

async function validarReferencias(
  itens: ItemRepository,
  centros: CentroTrabalhoRepository,
  itemId: string,
  centroTrabalhoId: string,
  estabelecimentoId: string,
): Promise<void> {
  const item = await itens.buscarPorId(itemId, estabelecimentoId);
  if (!item) throw new ItemNaoEncontradoError(itemId);

  const centro = await centros.buscarPorId(centroTrabalhoId, estabelecimentoId);
  if (!centro) throw new CentroTrabalhoNaoEncontradoError(centroTrabalhoId);
}

export class CriarCentroTrabalhoItemUseCase {
  constructor(
    private readonly vinculos: CentroTrabalhoItemRepository,
    private readonly itens: ItemRepository,
    private readonly centros: CentroTrabalhoRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaCentroTrabalhoItem): Promise<CentroTrabalhoItemDTO> {
    await validarReferencias(
      this.itens,
      this.centros,
      input.itemId,
      input.centroTrabalhoId,
      input.estabelecimentoId,
    );

    const existente = await this.vinculos.buscarPorItemECentro(
      input.itemId,
      input.centroTrabalhoId,
      input.estabelecimentoId,
    );
    if (existente) {
      throw new ItemCentroTrabalhoJaRelacionadosError();
    }

    const vinculo = CentroTrabalhoItem.criar({ ...input, idCentroTrabalhoItem: this.ids.gerar() });
    await this.vinculos.salvar(vinculo);
    return paraCentroTrabalhoItemDTO(vinculo);
  }
}

/** Item e Centro de Trabalho não entram no input — paridade com o bloqueio do legado. */
export class EditarCentroTrabalhoItemUseCase {
  constructor(private readonly vinculos: CentroTrabalhoItemRepository) {}

  async executar(
    input: AtributosCentroTrabalhoItem & { idCentroTrabalhoItem: string; estabelecimentoId: string },
  ): Promise<CentroTrabalhoItemDTO> {
    const vinculo = await this.vinculos.buscarPorId(input.idCentroTrabalhoItem, input.estabelecimentoId);
    if (!vinculo) {
      throw new CentroTrabalhoItemNaoEncontradoError(input.idCentroTrabalhoItem);
    }

    vinculo.alterar(input);
    await this.vinculos.salvar(vinculo);
    return paraCentroTrabalhoItemDTO(vinculo);
  }
}

export class ExcluirCentroTrabalhoItemUseCase {
  constructor(private readonly vinculos: CentroTrabalhoItemRepository) {}

  async executar(input: { idCentroTrabalhoItem: string; estabelecimentoId: string }): Promise<void> {
    const vinculo = await this.vinculos.buscarPorId(input.idCentroTrabalhoItem, input.estabelecimentoId);
    if (!vinculo) {
      throw new CentroTrabalhoItemNaoEncontradoError(input.idCentroTrabalhoItem);
    }
    await this.vinculos.excluir(input.idCentroTrabalhoItem);
  }
}

export class BuscarCentroTrabalhoItemUseCase {
  constructor(private readonly vinculos: CentroTrabalhoItemRepository) {}

  async executar(input: {
    idCentroTrabalhoItem: string;
    estabelecimentoId: string;
  }): Promise<CentroTrabalhoItemDTO> {
    const vinculo = await this.vinculos.buscarPorId(input.idCentroTrabalhoItem, input.estabelecimentoId);
    if (!vinculo) {
      throw new CentroTrabalhoItemNaoEncontradoError(input.idCentroTrabalhoItem);
    }
    return paraCentroTrabalhoItemDTO(vinculo);
  }
}

export class ListarCentrosTrabalhoItensUseCase {
  constructor(private readonly vinculos: CentroTrabalhoItemRepository) {}

  async executar(
    criterio: CriterioListagemCentroTrabalhoItem,
  ): Promise<ListaPaginadaDTO<CentroTrabalhoItemDTO>> {
    const [itens, count] = await Promise.all([
      this.vinculos.listar(criterio),
      this.vinculos.contar(criterio),
    ]);
    return { count, model: itens.map(paraCentroTrabalhoItemDTO) };
  }
}
