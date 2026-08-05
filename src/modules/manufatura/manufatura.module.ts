import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import {
  BuscarCalendarioUseCase,
  BuscarGrupoMaquinaUseCase,
  CriarCalendarioUseCase,
  CriarGrupoMaquinaUseCase,
  EditarCalendarioUseCase,
  EditarGrupoMaquinaUseCase,
  ExcluirCalendarioUseCase,
  ExcluirGrupoMaquinaUseCase,
  ListarCalendariosUseCase,
  ListarGruposMaquinaUseCase,
} from './application/use-cases/cadastros-apoio.use-cases.js';
import {
  BuscarOrdemProducaoUseCase,
  CriarOrdemProducaoUseCase,
  ListarOrdensProducaoUseCase,
} from './application/use-cases/ordem-producao.use-cases.js';
import {
  BuscarCentroTrabalhoUseCase,
  CriarCentroTrabalhoUseCase,
  EditarCentroTrabalhoUseCase,
  ExcluirCentroTrabalhoUseCase,
  ListarCentrosTrabalhoUseCase,
} from './application/use-cases/centro-trabalho.use-cases.js';
import {
  BuscarTurnoUseCase,
  CriarTurnoUseCase,
  EditarTurnoUseCase,
  ExcluirTurnoUseCase,
  ListarTurnosUseCase,
} from './application/use-cases/turno.use-cases.js';
import {
  BuscarReservaUseCase,
  CancelarReservaUseCase,
  CriarReservaUseCase,
  EditarReservaUseCase,
  ListarReservasUseCase,
} from './application/use-cases/reserva.use-cases.js';
import {
  BuscarMovimentoUseCase,
  CancelarMovimentoUseCase,
  ListarMovimentosUseCase,
  RegistrarMovimentoUseCase,
  ReintegrarMovimentoUseCase,
} from './application/use-cases/movimento.use-cases.js';
import {
  PrismaCatalogoTipos,
  PrismaMovimentoRepository,
} from './infrastructure/persistence/prisma-movimento.repositories.js';
import {
  PrismaCalendarioRepository,
  PrismaCentroTrabalhoRepository,
  PrismaTurnoRepository,
  PrismaReservaRepository,
  PrismaGrupoMaquinaRepository,
  PrismaOrdemProducaoRepository,
} from './infrastructure/persistence/prisma-manufatura.repositories.js';
import { PrismaVerificadorEstabelecimento } from './infrastructure/gateways/prisma-verificador-estabelecimento.js';
import { manufaturaRoutes, type ManufaturaUseCases } from './infrastructure/http/manufatura.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root da área Manufatura. Reúne três agregados que só fazem
 * sentido juntos — Centro de Trabalho e seus dois cadastros de apoio
 * (Calendário, obrigatório pelo CentroTrabalhoRN, e Grupo de Máquina).
 *
 * Como nos demais módulos, expõe uma fábrica que monta os use-cases sobre o
 * banco do tenant resolvido por request.
 */
export function construirModuloManufatura(ids: GeradorId, cadeia: CadeiaAutorizacaoInjetada) {
  const montarUseCases = (prisma: PrismaClient): ManufaturaUseCases => {
    const calendarios = new PrismaCalendarioRepository(prisma);
    const grupos = new PrismaGrupoMaquinaRepository(prisma);
    const centros = new PrismaCentroTrabalhoRepository(prisma);
    const turnos = new PrismaTurnoRepository(prisma);
    const reservas = new PrismaReservaRepository(prisma);
    const movimentos = new PrismaMovimentoRepository(prisma);
    const catalogoTipos = new PrismaCatalogoTipos(prisma);
    const estabelecimentos = new PrismaVerificadorEstabelecimento(prisma);
    const ordens = new PrismaOrdemProducaoRepository(prisma);

    return {
      criarCalendario: new CriarCalendarioUseCase(calendarios, ids),
      editarCalendario: new EditarCalendarioUseCase(calendarios),
      excluirCalendario: new ExcluirCalendarioUseCase(calendarios),
      buscarCalendario: new BuscarCalendarioUseCase(calendarios),
      listarCalendarios: new ListarCalendariosUseCase(calendarios),

      criarGrupoMaquina: new CriarGrupoMaquinaUseCase(grupos, ids),
      editarGrupoMaquina: new EditarGrupoMaquinaUseCase(grupos),
      excluirGrupoMaquina: new ExcluirGrupoMaquinaUseCase(grupos),
      buscarGrupoMaquina: new BuscarGrupoMaquinaUseCase(grupos),
      listarGruposMaquina: new ListarGruposMaquinaUseCase(grupos),

      criarCentroTrabalho: new CriarCentroTrabalhoUseCase(
        centros,
        calendarios,
        grupos,
        estabelecimentos,
        ids,
      ),
      editarCentroTrabalho: new EditarCentroTrabalhoUseCase(
        centros,
        calendarios,
        grupos,
        estabelecimentos,
      ),
      excluirCentroTrabalho: new ExcluirCentroTrabalhoUseCase(centros),
      buscarCentroTrabalho: new BuscarCentroTrabalhoUseCase(centros),
      listarCentrosTrabalho: new ListarCentrosTrabalhoUseCase(centros),
      criarOrdemProducao: new CriarOrdemProducaoUseCase(ordens, estabelecimentos, ids),
      buscarOrdemProducao: new BuscarOrdemProducaoUseCase(ordens),
      listarOrdensProducao: new ListarOrdensProducaoUseCase(ordens),

      registrarMovimento: new RegistrarMovimentoUseCase(
        movimentos,
        centros,
        ordens,
        reservas,
        turnos,
        catalogoTipos,
        ids,
      ),
      cancelarMovimento: new CancelarMovimentoUseCase(movimentos),
      reintegrarMovimento: new ReintegrarMovimentoUseCase(movimentos),
      buscarMovimento: new BuscarMovimentoUseCase(movimentos),
      listarMovimentos: new ListarMovimentosUseCase(movimentos),

      criarReserva: new CriarReservaUseCase(reservas, ordens, ids),
      editarReserva: new EditarReservaUseCase(reservas, ordens),
      cancelarReserva: new CancelarReservaUseCase(reservas, ordens),
      buscarReserva: new BuscarReservaUseCase(reservas),
      listarReservas: new ListarReservasUseCase(reservas),

      criarTurno: new CriarTurnoUseCase(turnos, calendarios, ids),
      editarTurno: new EditarTurnoUseCase(turnos, calendarios),
      excluirTurno: new ExcluirTurnoUseCase(turnos),
      buscarTurno: new BuscarTurnoUseCase(turnos),
      listarTurnos: new ListarTurnosUseCase(turnos),
    };
  };

  return {
    routes: manufaturaRoutes({ montarUseCases, ...cadeia }),
  };
}
