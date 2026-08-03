import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarDispositivoIotUseCase } from './application/use-cases/criar-dispositivo-iot.use-case.js';
import { EditarDispositivoIotUseCase } from './application/use-cases/editar-dispositivo-iot.use-case.js';
import { ExcluirDispositivoIotUseCase } from './application/use-cases/excluir-dispositivo-iot.use-case.js';
import { BuscarDispositivoIotUseCase } from './application/use-cases/buscar-dispositivo-iot.use-case.js';
import { ListarDispositivosIotUseCase } from './application/use-cases/listar-dispositivos-iot.use-case.js';
import { PrismaDispositivoIotRepository } from './infrastructure/persistence/prisma-dispositivo-iot.repository.js';
import { PrismaVerificadorEstabelecimento } from './infrastructure/gateways/prisma-verificador-estabelecimento.js';
import {
  RabbitMqConsultorConexoes,
  type ResolvedorAcessoBroker,
} from './infrastructure/gateways/rabbitmq-consultor-conexoes.js';
import {
  dispositivoIotRoutes,
  type DispositivoIotUseCases,
} from './infrastructure/http/dispositivo-iot.routes.js';

/** A mesma cadeia de autorização exposta pelo módulo usuários. */
export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do contexto de coletores IoT (migrado de
 * CentroTrabalhoIOTController/ConfigIOTController + IOTDAO/ConfigIOTDAO).
 *
 * O acesso ao broker chega por injeção (`resolverAcessoBroker`) porque a
 * config do RabbitMQ vive no Control Plane — este módulo não pode importar
 * daquele, e a fronteira é verificada pelo dependency-cruiser.
 */
export function construirModuloIot(
  ids: GeradorId,
  cadeia: CadeiaAutorizacaoInjetada,
  resolverAcessoBroker: ResolvedorAcessoBroker,
) {
  const broker = new RabbitMqConsultorConexoes(resolverAcessoBroker);

  const montarUseCases = (prisma: PrismaClient): DispositivoIotUseCases => {
    const dispositivos = new PrismaDispositivoIotRepository(prisma);
    const estabelecimentos = new PrismaVerificadorEstabelecimento(prisma);
    return {
      criarDispositivo: new CriarDispositivoIotUseCase(dispositivos, estabelecimentos, ids),
      editarDispositivo: new EditarDispositivoIotUseCase(dispositivos, broker, ids),
      excluirDispositivo: new ExcluirDispositivoIotUseCase(dispositivos),
      buscarDispositivo: new BuscarDispositivoIotUseCase(dispositivos, broker),
      listarDispositivos: new ListarDispositivosIotUseCase(dispositivos, broker),
    };
  };

  return {
    routes: dispositivoIotRoutes({ montarUseCases, ...cadeia }),
  };
}
