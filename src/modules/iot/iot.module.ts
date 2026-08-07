import type { PrismaClient } from '@prisma/client';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { CriarDispositivoIotUseCase } from './application/use-cases/criar-dispositivo-iot.use-case.js';
import { EditarDispositivoIotUseCase } from './application/use-cases/editar-dispositivo-iot.use-case.js';
import { ExcluirDispositivoIotUseCase } from './application/use-cases/excluir-dispositivo-iot.use-case.js';
import { BuscarDispositivoIotUseCase } from './application/use-cases/buscar-dispositivo-iot.use-case.js';
import { ListarDispositivosIotUseCase } from './application/use-cases/listar-dispositivos-iot.use-case.js';
import { ConsultarContadoresIotUseCase } from './application/use-cases/consultar-contadores-iot.use-case.js';
import { ConsultarFalhasIotUseCase } from './application/use-cases/consultar-falhas-iot.use-case.js';
import { ConsultarLinhaDoTempoIotUseCase } from './application/use-cases/consultar-linha-do-tempo-iot.use-case.js';
import { MonitorarBrokerIotUseCase } from './application/use-cases/monitorar-broker-iot.use-case.js';
import { PrismaDispositivoIotRepository } from './infrastructure/persistence/prisma-dispositivo-iot.repository.js';
import { PrismaLeituraIotRepository } from './infrastructure/persistence/prisma-leitura-iot.repository.js';
import { PrismaFalhaLeituraIotRepository } from './infrastructure/persistence/prisma-falha-leitura-iot.repository.js';
import { PrismaFirmwareRepository } from './infrastructure/persistence/prisma-firmware.repository.js';
import { PrismaAtualizacaoFirmwareRepository } from './infrastructure/persistence/prisma-atualizacao-firmware.repository.js';
import { PrismaVerificadorEstabelecimento } from './infrastructure/gateways/prisma-verificador-estabelecimento.js';
import {
  RabbitMqConsultorConexoes,
  type ResolvedorAcessoBroker,
} from './infrastructure/gateways/rabbitmq-consultor-conexoes.js';
import { RabbitMqMonitorBrokerIot } from './infrastructure/gateways/rabbitmq-monitor-broker-iot.js';
import { AmqpPublicadorConfiguracaoIot } from './infrastructure/gateways/amqp-publicador-configuracao.js';
import { AmqpPublicadorAtualizacaoFirmwareIot } from './infrastructure/gateways/amqp-publicador-atualizacao-firmware.js';
import {
  S3ArmazenamentoFirmware,
  type ResolvedorAcessoObjectStorage,
} from './infrastructure/gateways/s3-armazenamento-firmware.js';
import {
  dispositivoIotRoutes,
  type DispositivoIotUseCases,
} from './infrastructure/http/dispositivo-iot.routes.js';
import { firmwareIotRoutes, type FirmwareIotUseCases } from './infrastructure/http/firmware-iot.routes.js';
import { EnviarFirmwareUseCase } from './application/use-cases/enviar-firmware.use-case.js';
import { ListarFirmwaresUseCase } from './application/use-cases/listar-firmwares.use-case.js';
import { SolicitarAtualizacaoFirmwareUseCase } from './application/use-cases/solicitar-atualizacao-firmware.use-case.js';
import { ListarHistoricoAtualizacoesFirmwareUseCase } from './application/use-cases/listar-historico-atualizacoes-firmware.use-case.js';
import { BaixarFirmwareUseCase } from './application/use-cases/baixar-firmware.use-case.js';

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
 * O acesso ao broker e ao object storage chegam por injeção
 * (`resolverAcessoBroker`/`resolverAcessoObjectStorage`) porque essas configs
 * vivem no Control Plane — este módulo não pode importar daquele, e a
 * fronteira é verificada pelo dependency-cruiser.
 */
export function construirModuloIot(
  ids: GeradorId,
  cadeia: CadeiaAutorizacaoInjetada,
  resolverAcessoBroker: ResolvedorAcessoBroker,
  resolverAcessoObjectStorage: ResolvedorAcessoObjectStorage,
  /** Resolve o PrismaClient do tenant a partir do tenantId — só a rota pública de download usa. */
  resolverConexaoTenant: (tenantId: string) => Promise<PrismaClient>,
  /** URL pública da API (ex.: https://api.exemplo.com) — monta o link de download do firmware. */
  publicApiUrl: string,
) {
  const broker = new RabbitMqConsultorConexoes(resolverAcessoBroker);
  const monitorBroker = new RabbitMqMonitorBrokerIot(resolverAcessoBroker);
  const log = (nivel: 'info' | 'erro', msg: string, extra?: unknown) => {
    if (nivel === 'erro') console.error(`[iot] ${msg}`, extra ?? '');
  };
  const publicadorConfiguracao = new AmqpPublicadorConfiguracaoIot(resolverAcessoBroker, log);
  const publicadorAtualizacao = new AmqpPublicadorAtualizacaoFirmwareIot(resolverAcessoBroker, log);
  const armazenamento = new S3ArmazenamentoFirmware(resolverAcessoObjectStorage);

  const montarUrlDownload = (tenantId: string, firmwareId: string) =>
    `${publicApiUrl}/firmware/download/${tenantId}/${firmwareId}`;

  const montarUseCases = (prisma: PrismaClient): DispositivoIotUseCases => {
    const dispositivos = new PrismaDispositivoIotRepository(prisma);
    const leituras = new PrismaLeituraIotRepository(prisma);
    const falhas = new PrismaFalhaLeituraIotRepository(prisma);
    const estabelecimentos = new PrismaVerificadorEstabelecimento(prisma);
    return {
      consultarContadores: new ConsultarContadoresIotUseCase(dispositivos, leituras),
      consultarFalhas: new ConsultarFalhasIotUseCase(dispositivos, falhas),
      consultarLinhaDoTempo: new ConsultarLinhaDoTempoIotUseCase(dispositivos, leituras),
      criarDispositivo: new CriarDispositivoIotUseCase(dispositivos, estabelecimentos, ids),
      editarDispositivo: new EditarDispositivoIotUseCase(dispositivos, broker, ids, publicadorConfiguracao),
      excluirDispositivo: new ExcluirDispositivoIotUseCase(dispositivos),
      buscarDispositivo: new BuscarDispositivoIotUseCase(dispositivos, broker),
      listarDispositivos: new ListarDispositivosIotUseCase(dispositivos, broker),
    };
  };

  const montarFirmwareUseCases = (prisma: PrismaClient): FirmwareIotUseCases => {
    const dispositivos = new PrismaDispositivoIotRepository(prisma);
    const firmwares = new PrismaFirmwareRepository(prisma);
    const atualizacoes = new PrismaAtualizacaoFirmwareRepository(prisma);
    return {
      enviarFirmware: new EnviarFirmwareUseCase(firmwares, armazenamento, ids),
      listarFirmwares: new ListarFirmwaresUseCase(firmwares),
      solicitarAtualizacaoFirmware: new SolicitarAtualizacaoFirmwareUseCase(
        atualizacoes,
        dispositivos,
        firmwares,
        publicadorAtualizacao,
        ids,
        montarUrlDownload,
      ),
      listarHistoricoAtualizacoesFirmware: new ListarHistoricoAtualizacoesFirmwareUseCase(
        atualizacoes,
        dispositivos,
      ),
    };
  };

  const montarBaixarFirmware = (prisma: PrismaClient): BaixarFirmwareUseCase => {
    const firmwares = new PrismaFirmwareRepository(prisma);
    return new BaixarFirmwareUseCase(firmwares, armazenamento);
  };

  return {
    routes: [
      dispositivoIotRoutes({
        montarUseCases,
        monitorarBroker: new MonitorarBrokerIotUseCase(monitorBroker),
        ...cadeia,
      }),
      firmwareIotRoutes({
        montarUseCases: montarFirmwareUseCases,
        montarBaixarFirmware,
        resolverConexaoTenant,
        ...cadeia,
      }),
    ],
    /** Exposto para outros composition roots cruzarem status online sem importar o módulo (ex.: monitor). */
    seriaisConectados: (tenantId: string) => broker.seriaisConectados(tenantId),
    /**
     * Exposto para o composition root montar adapters de contadores/linha do
     * tempo por dispositivo para o módulo `monitor` (agregação por centro de
     * trabalho), reaproveitando a mesma regra de negócio dos endpoints
     * por-dispositivo sem duplicá-la.
     */
    montarDispositivoUseCases: montarUseCases,
  };
}
