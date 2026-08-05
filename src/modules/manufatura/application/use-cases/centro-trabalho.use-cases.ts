import { CentroTrabalho, type DadosCentroTrabalho } from '../../domain/entities/centro-trabalho.js';
import type {
  CalendarioRepository,
  CentroTrabalhoRepository,
  CriterioListagem,
  GrupoMaquinaRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import type { VerificadorEstabelecimento } from '../../domain/gateways/verificador-estabelecimento.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  CalendarioNaoEncontradoError,
  CentroTrabalhoNaoEncontradoError,
  CodigoCentroTrabalhoJaExisteError,
  EstabelecimentoInativoError,
  EstabelecimentoSemManufaturaError,
  GrupoMaquinaNaoEncontradoError,
} from '../../domain/exceptions/manufatura.errors.js';
import {
  paraCentroTrabalhoDTO,
  type CentroTrabalhoDTO,
  type ListaPaginadaDTO,
} from '../dtos/manufatura.dtos.js';

export interface EntradaCentroTrabalho extends DadosCentroTrabalho {
  estabelecimentoId: string;
}

/**
 * Regras que dependem de banco, na ordem do CentroTrabalhoRN.ValidarCentroTrabalho.
 * Extraída porque criar e editar aplicam exatamente a mesma sequência.
 */
async function validarReferencias(
  input: EntradaCentroTrabalho,
  deps: {
    calendarios: CalendarioRepository;
    grupos: GrupoMaquinaRepository;
    estabelecimentos: VerificadorEstabelecimento;
  },
): Promise<void> {
  if (!(await deps.estabelecimentos.estaAtivo(input.estabelecimentoId))) {
    throw new EstabelecimentoInativoError(input.estabelecimentoId);
  }
  if (!(await deps.estabelecimentos.temManufatura(input.estabelecimentoId))) {
    throw new EstabelecimentoSemManufaturaError(input.estabelecimentoId);
  }

  const calendario = await deps.calendarios.buscarPorId(
    input.calendarioId,
    input.estabelecimentoId,
  );
  if (!calendario) {
    throw new CalendarioNaoEncontradoError(input.calendarioId);
  }

  // Opcional: só validado quando informado (paridade com o RN). A checagem
  // legada de "mesmo estabelecimento do calendário" é estrutural aqui — a busca
  // já é escopada pelo estabelecimento ativo do contexto.
  const grupoMaquinaId = input.vinculos?.grupoMaquinaId;
  if (grupoMaquinaId) {
    const grupo = await deps.grupos.buscarPorId(grupoMaquinaId, input.estabelecimentoId);
    if (!grupo) {
      throw new GrupoMaquinaNaoEncontradoError(grupoMaquinaId);
    }
  }
}

/**
 * Cria um Centro de Trabalho. Preserva CentroTrabalhoRN.AdicionarCentroTrabalho:
 *   1. invariantes de forma      (entidade: código, descrição, tratamento, custo)
 *   2. estabelecimento ativo e com produto Manufatura
 *   3. calendário existe          → "Informe um calendário." / "não cadastrado."
 *   4. grupo de máquina, se informado, existe
 *   5. código único               → "já cadastrado."
 */
export class CriarCentroTrabalhoUseCase {
  constructor(
    private readonly centros: CentroTrabalhoRepository,
    private readonly calendarios: CalendarioRepository,
    private readonly grupos: GrupoMaquinaRepository,
    private readonly estabelecimentos: VerificadorEstabelecimento,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaCentroTrabalho): Promise<CentroTrabalhoDTO> {
    const centro = CentroTrabalho.criar({
      ...input,
      idCentroTrabalho: this.ids.gerar(),
    });

    await validarReferencias(input, {
      calendarios: this.calendarios,
      grupos: this.grupos,
      estabelecimentos: this.estabelecimentos,
    });

    const existente = await this.centros.buscarPorCodigo(centro.codigo, input.estabelecimentoId);
    if (existente) {
      throw new CodigoCentroTrabalhoJaExisteError(centro.codigo);
    }

    await this.centros.salvar(centro);
    return paraCentroTrabalhoDTO(centro);
  }
}

/**
 * Edita um Centro de Trabalho (CentroTrabalhoRN.EditarCentroTrabalho). Mesma
 * validação da criação + existência, e a unicidade só é checada se o código
 * mudou — igual ao que Áreas faz.
 */
export class EditarCentroTrabalhoUseCase {
  constructor(
    private readonly centros: CentroTrabalhoRepository,
    private readonly calendarios: CalendarioRepository,
    private readonly grupos: GrupoMaquinaRepository,
    private readonly estabelecimentos: VerificadorEstabelecimento,
  ) {}

  async executar(
    input: EntradaCentroTrabalho & { idCentroTrabalho: string },
  ): Promise<CentroTrabalhoDTO> {
    const centro = await this.centros.buscarPorId(input.idCentroTrabalho, input.estabelecimentoId);
    if (!centro) {
      throw new CentroTrabalhoNaoEncontradoError(input.idCentroTrabalho);
    }

    await validarReferencias(input, {
      calendarios: this.calendarios,
      grupos: this.grupos,
      estabelecimentos: this.estabelecimentos,
    });

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== centro.codigo) {
      const colisao = await this.centros.buscarPorCodigo(novoCodigo, input.estabelecimentoId);
      if (colisao) {
        throw new CodigoCentroTrabalhoJaExisteError(novoCodigo);
      }
    }

    centro.alterar(input);
    await this.centros.salvar(centro);
    return paraCentroTrabalhoDTO(centro);
  }
}

/** Exclui um Centro de Trabalho (CentroTrabalhoRN.ExcluirCentrosTrabalho). */
export class ExcluirCentroTrabalhoUseCase {
  constructor(private readonly centros: CentroTrabalhoRepository) {}

  async executar(input: { idCentroTrabalho: string; estabelecimentoId: string }): Promise<void> {
    const centro = await this.centros.buscarPorId(input.idCentroTrabalho, input.estabelecimentoId);
    if (!centro) {
      throw new CentroTrabalhoNaoEncontradoError(input.idCentroTrabalho);
    }
    await this.centros.excluir(input.idCentroTrabalho);
  }
}

export class BuscarCentroTrabalhoUseCase {
  constructor(private readonly centros: CentroTrabalhoRepository) {}

  async executar(input: {
    idCentroTrabalho: string;
    estabelecimentoId: string;
  }): Promise<CentroTrabalhoDTO> {
    const centro = await this.centros.buscarPorId(input.idCentroTrabalho, input.estabelecimentoId);
    if (!centro) {
      throw new CentroTrabalhoNaoEncontradoError(input.idCentroTrabalho);
    }
    return paraCentroTrabalhoDTO(centro);
  }
}

export class ListarCentrosTrabalhoUseCase {
  constructor(private readonly centros: CentroTrabalhoRepository) {}

  async executar(criterio: CriterioListagem): Promise<ListaPaginadaDTO<CentroTrabalhoDTO>> {
    const [itens, count] = await Promise.all([
      this.centros.listar(criterio),
      this.centros.contar(criterio.estabelecimentoId, criterio.termo),
    ]);
    return { count, model: itens.map(paraCentroTrabalhoDTO) };
  }
}
