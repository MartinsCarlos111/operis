import { Ferramenta } from '../../domain/entities/ferramenta.js';
import type { CriterioListagemFerramenta, FerramentaRepository } from '../../domain/repositories/ferramenta.repositories.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { AppError } from '@shared/errors/app-error.js';
import type { ListaPaginadaDTO } from '../dtos/manufatura.dtos.js';

export class FerramentaNaoEncontradaError extends AppError {
  readonly code = 'FERRAMENTA_NAO_ENCONTRADA';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Ferramenta '${id}' não encontrada.`);
  }
}

export class FerramentaJaExisteError extends AppError {
  readonly code = 'FERRAMENTA_JA_EXISTE';
  readonly httpStatus = 409;
  constructor(codigo: string) {
    super(`Ferramenta com código '${codigo}' já cadastrada neste estabelecimento.`);
  }
}

export interface FerramentaDTO {
  idFerramenta: string;
  codigo: string;
  descricao: string;
  vidaUtilUnidade: number | null;
  vidaUtilSegundos: number | null;
  status: string;
  estabelecimentoId: string;
}

export function paraFerramentaDTO(f: Ferramenta): FerramentaDTO {
  return {
    idFerramenta: f.idFerramenta,
    codigo: f.codigo,
    descricao: f.descricao,
    vidaUtilUnidade: f.vidaUtilUnidade,
    vidaUtilSegundos: f.vidaUtilSegundos,
    status: f.status,
    estabelecimentoId: f.estabelecimentoId,
  };
}

export class CriarFerramentaUseCase {
  constructor(
    private readonly ferramentas: FerramentaRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: {
    estabelecimentoId: string;
    codigo: string;
    descricao: string;
    vidaUtilUnidade?: number | null | undefined;
    vidaUtilSegundos?: number | null | undefined;
  }): Promise<FerramentaDTO> {
    const existente = await this.ferramentas.buscarPorCodigo(input.codigo, input.estabelecimentoId);
    if (existente) throw new FerramentaJaExisteError(input.codigo);
    const f = Ferramenta.criar({
      idFerramenta: this.ids.gerar(),
      ...input,
    });
    await this.ferramentas.salvar(f);
    return paraFerramentaDTO(f);
  }
}

export class EditarFerramentaUseCase {
  constructor(private readonly ferramentas: FerramentaRepository) {}

  async executar(input: {
    idFerramenta: string;
    estabelecimentoId: string;
    descricao?: string | undefined;
    vidaUtilUnidade?: number | null | undefined;
    vidaUtilSegundos?: number | null | undefined;
  }): Promise<FerramentaDTO> {
    const existente = await this.ferramentas.buscarPorId(input.idFerramenta, input.estabelecimentoId);
    if (!existente) throw new FerramentaNaoEncontradaError(input.idFerramenta);
    const atualizada = Ferramenta.criar({
      idFerramenta: existente.idFerramenta,
      codigo: existente.codigo,
      descricao: input.descricao ?? existente.descricao,
      vidaUtilUnidade: input.vidaUtilUnidade ?? existente.vidaUtilUnidade,
      vidaUtilSegundos: input.vidaUtilSegundos ?? existente.vidaUtilSegundos,
      estabelecimentoId: existente.estabelecimentoId,
      status: existente.status,
    });
    await this.ferramentas.salvar(atualizada);
    return paraFerramentaDTO(atualizada);
  }
}

export class ExcluirFerramentaUseCase {
  constructor(private readonly ferramentas: FerramentaRepository) {}

  async executar(input: { idFerramenta: string; estabelecimentoId: string }): Promise<void> {
    const existente = await this.ferramentas.buscarPorId(input.idFerramenta, input.estabelecimentoId);
    if (!existente) throw new FerramentaNaoEncontradaError(input.idFerramenta);
    await this.ferramentas.excluir(input.idFerramenta);
  }
}

export class ListarFerramentasUseCase {
  constructor(private readonly ferramentas: FerramentaRepository) {}

  async executar(criterio: CriterioListagemFerramenta): Promise<ListaPaginadaDTO<FerramentaDTO>> {
    const [itens, total] = await Promise.all([
      this.ferramentas.listar(criterio),
      this.ferramentas.contar(criterio),
    ]);
    return { model: itens.map(paraFerramentaDTO), count: total };
  }
}