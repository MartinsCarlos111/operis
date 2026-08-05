import { Calendario } from '../../domain/entities/calendario.js';
import { GrupoMaquina, type RegraDespacho } from '../../domain/entities/grupo-maquina.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type {
  CalendarioRepository,
  CriterioListagem,
  GrupoMaquinaRepository,
} from '../../domain/repositories/manufatura.repositories.js';
import {
  CalendarioEmUsoError,
  CalendarioNaoEncontradoError,
  CodigoCalendarioJaExisteError,
  CodigoGrupoMaquinaJaExisteError,
  GrupoMaquinaEmUsoError,
  GrupoMaquinaNaoEncontradoError,
} from '../../domain/exceptions/manufatura.errors.js';
import {
  paraCalendarioDTO,
  paraGrupoMaquinaDTO,
  type CalendarioDTO,
  type GrupoMaquinaDTO,
  type ListaPaginadaDTO,
} from '../dtos/manufatura.dtos.js';

/**
 * Cadastros de apoio do Centro de Trabalho: Calendário e Grupo de Máquina.
 * Ambos são CRUDs escopados pelo estabelecimento ativo com código único —
 * mesma regra de Áreas, e a exclusão é bloqueada quando há centros de trabalho
 * apontando para o registro (paridade com o bloqueio de Área por usuários).
 */

// ---------------------------------------------------------------- Calendário

export interface EntradaCalendario {
  estabelecimentoId: string;
  codigo: string;
  descricao: string;
  status?: StatusRecurso | undefined;
}

export class CriarCalendarioUseCase {
  constructor(
    private readonly calendarios: CalendarioRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaCalendario): Promise<CalendarioDTO> {
    const calendario = Calendario.criar({ ...input, idCalendario: this.ids.gerar() });

    const existente = await this.calendarios.buscarPorCodigo(
      calendario.codigo,
      input.estabelecimentoId,
    );
    if (existente) {
      throw new CodigoCalendarioJaExisteError(calendario.codigo);
    }

    await this.calendarios.salvar(calendario);
    return paraCalendarioDTO(calendario);
  }
}

export class EditarCalendarioUseCase {
  constructor(private readonly calendarios: CalendarioRepository) {}

  async executar(input: EntradaCalendario & { idCalendario: string }): Promise<CalendarioDTO> {
    const calendario = await this.calendarios.buscarPorId(
      input.idCalendario,
      input.estabelecimentoId,
    );
    if (!calendario) {
      throw new CalendarioNaoEncontradoError(input.idCalendario);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== calendario.codigo) {
      const colisao = await this.calendarios.buscarPorCodigo(
        novoCodigo,
        input.estabelecimentoId,
      );
      if (colisao) {
        throw new CodigoCalendarioJaExisteError(novoCodigo);
      }
    }

    calendario.alterar(input);
    await this.calendarios.salvar(calendario);
    return paraCalendarioDTO(calendario);
  }
}

export class ExcluirCalendarioUseCase {
  constructor(private readonly calendarios: CalendarioRepository) {}

  async executar(input: { idCalendario: string; estabelecimentoId: string }): Promise<void> {
    const calendario = await this.calendarios.buscarPorId(
      input.idCalendario,
      input.estabelecimentoId,
    );
    if (!calendario) {
      throw new CalendarioNaoEncontradoError(input.idCalendario);
    }

    const emUso = await this.calendarios.contarCentrosTrabalho(input.idCalendario);
    if (emUso > 0) {
      throw new CalendarioEmUsoError(calendario.codigo, emUso);
    }

    await this.calendarios.excluir(input.idCalendario);
  }
}

export class BuscarCalendarioUseCase {
  constructor(private readonly calendarios: CalendarioRepository) {}

  async executar(input: {
    idCalendario: string;
    estabelecimentoId: string;
  }): Promise<CalendarioDTO> {
    const calendario = await this.calendarios.buscarPorId(
      input.idCalendario,
      input.estabelecimentoId,
    );
    if (!calendario) {
      throw new CalendarioNaoEncontradoError(input.idCalendario);
    }
    return paraCalendarioDTO(calendario);
  }
}

export class ListarCalendariosUseCase {
  constructor(private readonly calendarios: CalendarioRepository) {}

  async executar(criterio: CriterioListagem): Promise<ListaPaginadaDTO<CalendarioDTO>> {
    const [itens, count] = await Promise.all([
      this.calendarios.listar(criterio),
      this.calendarios.contar(criterio.estabelecimentoId, criterio.termo),
    ]);
    return { count, model: itens.map(paraCalendarioDTO) };
  }
}

// ---------------------------------------------------------- Grupo de Máquina

export interface EntradaGrupoMaquina {
  estabelecimentoId: string;
  codigo: string;
  descricao: string;
  regraDespacho?: RegraDespacho | undefined;
  status?: StatusRecurso | undefined;
}

export class CriarGrupoMaquinaUseCase {
  constructor(
    private readonly grupos: GrupoMaquinaRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(input: EntradaGrupoMaquina): Promise<GrupoMaquinaDTO> {
    const grupo = GrupoMaquina.criar({ ...input, idGrupoMaquina: this.ids.gerar() });

    const existente = await this.grupos.buscarPorCodigo(grupo.codigo, input.estabelecimentoId);
    if (existente) {
      throw new CodigoGrupoMaquinaJaExisteError(grupo.codigo);
    }

    await this.grupos.salvar(grupo);
    return paraGrupoMaquinaDTO(grupo);
  }
}

export class EditarGrupoMaquinaUseCase {
  constructor(private readonly grupos: GrupoMaquinaRepository) {}

  async executar(
    input: EntradaGrupoMaquina & { idGrupoMaquina: string },
  ): Promise<GrupoMaquinaDTO> {
    const grupo = await this.grupos.buscarPorId(input.idGrupoMaquina, input.estabelecimentoId);
    if (!grupo) {
      throw new GrupoMaquinaNaoEncontradoError(input.idGrupoMaquina);
    }

    const novoCodigo = input.codigo.trim();
    if (novoCodigo !== grupo.codigo) {
      const colisao = await this.grupos.buscarPorCodigo(novoCodigo, input.estabelecimentoId);
      if (colisao) {
        throw new CodigoGrupoMaquinaJaExisteError(novoCodigo);
      }
    }

    grupo.alterar(input);
    await this.grupos.salvar(grupo);
    return paraGrupoMaquinaDTO(grupo);
  }
}

export class ExcluirGrupoMaquinaUseCase {
  constructor(private readonly grupos: GrupoMaquinaRepository) {}

  async executar(input: { idGrupoMaquina: string; estabelecimentoId: string }): Promise<void> {
    const grupo = await this.grupos.buscarPorId(input.idGrupoMaquina, input.estabelecimentoId);
    if (!grupo) {
      throw new GrupoMaquinaNaoEncontradoError(input.idGrupoMaquina);
    }

    const emUso = await this.grupos.contarCentrosTrabalho(input.idGrupoMaquina);
    if (emUso > 0) {
      throw new GrupoMaquinaEmUsoError(grupo.codigo, emUso);
    }

    await this.grupos.excluir(input.idGrupoMaquina);
  }
}

export class BuscarGrupoMaquinaUseCase {
  constructor(private readonly grupos: GrupoMaquinaRepository) {}

  async executar(input: {
    idGrupoMaquina: string;
    estabelecimentoId: string;
  }): Promise<GrupoMaquinaDTO> {
    const grupo = await this.grupos.buscarPorId(input.idGrupoMaquina, input.estabelecimentoId);
    if (!grupo) {
      throw new GrupoMaquinaNaoEncontradoError(input.idGrupoMaquina);
    }
    return paraGrupoMaquinaDTO(grupo);
  }
}

export class ListarGruposMaquinaUseCase {
  constructor(private readonly grupos: GrupoMaquinaRepository) {}

  async executar(criterio: CriterioListagem): Promise<ListaPaginadaDTO<GrupoMaquinaDTO>> {
    const [itens, count] = await Promise.all([
      this.grupos.listar(criterio),
      this.grupos.contar(criterio.estabelecimentoId, criterio.termo),
    ]);
    return { count, model: itens.map(paraGrupoMaquinaDTO) };
  }
}
