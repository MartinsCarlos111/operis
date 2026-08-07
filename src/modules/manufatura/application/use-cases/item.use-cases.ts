import { Item } from '../../domain/entities/item.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type {
  CriterioListagem,
  ItemRepository,
  QualidadeItemRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import {
  CodigoItemJaExisteError,
  ItemNaoEncontradoError,
  QualidadeItemInvalidaError,
} from '../../domain/exceptions/manufatura.errors.js';
import { paraItemDTO, type ItemDTO, type ListaPaginadaDTO } from '../dtos/manufatura.dtos.js';

export interface EntradaItem {
  estabelecimentoId: string;
  codigo: string;
  descricao: string;
  status?: StatusRecurso | undefined;
  qualidadeItemIds?: string[] | undefined;
}

/** Confere que toda qualidade selecionada existe no estabelecimento ativo. */
async function validarQualidades(
  qualidades: QualidadeItemRepository,
  qualidadeItemIds: string[] | undefined,
  estabelecimentoId: string,
): Promise<void> {
  for (const id of qualidadeItemIds ?? []) {
    const existente = await qualidades.buscarPorId(id, estabelecimentoId);
    if (!existente) {
      throw new QualidadeItemInvalidaError(id);
    }
  }
}

export class CriarItemUseCase {
  constructor(
    private readonly itens: ItemRepository,
    private readonly qualidades: QualidadeItemRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaItem): Promise<ItemDTO> {
    await validarQualidades(this.qualidades, input.qualidadeItemIds, input.estabelecimentoId);

    const item = Item.criar({ ...input, idItem: this.ids.gerar() });

    const existente = await this.itens.buscarPorCodigo(item.codigo, input.estabelecimentoId);
    if (existente) {
      throw new CodigoItemJaExisteError(item.codigo);
    }

    await this.itens.salvar(item);
    return paraItemDTO(item);
  }
}

export class EditarItemUseCase {
  constructor(
    private readonly itens: ItemRepository,
    private readonly qualidades: QualidadeItemRepository,
  ) {}

  async executar(input: EntradaItem & { idItem: string }): Promise<ItemDTO> {
    const item = await this.itens.buscarPorId(input.idItem, input.estabelecimentoId);
    if (!item) {
      throw new ItemNaoEncontradoError(input.idItem);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== item.codigo) {
      const colisao = await this.itens.buscarPorCodigo(novoCodigo, input.estabelecimentoId);
      if (colisao) {
        throw new CodigoItemJaExisteError(novoCodigo);
      }
    }

    await validarQualidades(this.qualidades, input.qualidadeItemIds, input.estabelecimentoId);

    item.alterar(input);
    await this.itens.salvar(item);
    return paraItemDTO(item);
  }
}

export class ExcluirItemUseCase {
  constructor(private readonly itens: ItemRepository) {}

  async executar(input: { idItem: string; estabelecimentoId: string }): Promise<void> {
    const item = await this.itens.buscarPorId(input.idItem, input.estabelecimentoId);
    if (!item) {
      throw new ItemNaoEncontradoError(input.idItem);
    }

    await this.itens.excluir(input.idItem);
  }
}

export class BuscarItemUseCase {
  constructor(private readonly itens: ItemRepository) {}

  async executar(input: { idItem: string; estabelecimentoId: string }): Promise<ItemDTO> {
    const item = await this.itens.buscarPorId(input.idItem, input.estabelecimentoId);
    if (!item) {
      throw new ItemNaoEncontradoError(input.idItem);
    }
    return paraItemDTO(item);
  }
}

export class ListarItensUseCase {
  constructor(private readonly itens: ItemRepository) {}

  async executar(criterio: CriterioListagem): Promise<ListaPaginadaDTO<ItemDTO>> {
    const [itens, count] = await Promise.all([
      this.itens.listar(criterio),
      this.itens.contar(criterio.estabelecimentoId, criterio.termo),
    ]);
    return { count, model: itens.map(paraItemDTO) };
  }
}
