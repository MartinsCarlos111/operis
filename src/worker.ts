import { createPrismaClient } from '@shared/infra/prisma/prisma-client.js';
import { CryptoGeradorId } from '@shared/infra/gateways/crypto-gerador-id.js';
import { AesGcmEncryptionService } from '@modules/operis_control/infrastructure/gateways/aes-gcm-encryption.service.js';
import { IotWorker, type LogWorker } from '@modules/iot/worker/iot-worker.js';
import { IndicadoresWorker } from '@modules/indicadores/worker/indicadores-worker.js';
import { MonitorWorker } from '@modules/monitor/worker/monitor-worker.js';
import { MoverOrdensParaHistoricoWorker } from '@modules/manufatura/worker/mover-ordens-para-historico.worker.js';
import { CalculoConsumoFerramentaWorker } from '@modules/manufatura/worker/calculo-consumo-ferramenta.worker.js';
import { PrismaClient } from '@prisma/client';

/**
 * Processo dos workers do operis. Cada tenant ativo com broker+banco configurados
 * sobe um conjunto de workers por tempo longo:
 *
 *   - IotWorker                            : ingestão AMQP (registro de leituras,
 *                                            REGISTER, OTAUPDATE).
 *   - IndicadoresWorker                    : cálculo OEE/TEEP a cada 10s
 *                                            (paridade com `ManServiceCalc.CalcularOEE`).
 *   - MonitorWorker                        : snapshot CentroTrabalhoOnline a cada
 *                                            10s (`MontarCentrosTrabalhoOnline`).
 *   - CalculoConsumoFerramentaWorker       : consumo por turno (`CalcularConsumoFerramenta`).
 *   - MoverOrdensParaHistoricoWorker       : job diário (`MoverOrdensParaHistorico`).
 *
 * Separado da API de propósito: AMQP é conexão de longa duração e os ticks de
 * 10s não podem disputar o event loop que atende as rotas HTTP.
 *
 *   npm run worker
 */
const log: LogWorker = (nivel, msg, extra) => {
  const linha = `[${new Date().toISOString()}] ${nivel.toUpperCase()} ${msg}`;
  if (nivel === 'erro') console.error(linha, extra ?? '');
  else console.log(linha);
};

interface WorkersTenant {
  iot: IotWorker;
  indicadores: IndicadoresWorker;
  monitor: MonitorWorker;
  consumoFerramenta: CalculoConsumoFerramentaWorker;
  moverHistorico: MoverOrdensParaHistoricoWorker;
}

async function main(): Promise<void> {
  const chaveMestra = process.env.ENCRYPTION_MASTER_KEY;
  if (!chaveMestra) {
    console.error('ENCRYPTION_MASTER_KEY não definida — configure no .env');
    process.exit(1);
  }

  const controlPlane = createPrismaClient(process.env.DATABASE_URL);
  const encryption = new AesGcmEncryptionService(chaveMestra);
  const ids = new CryptoGeradorId();

  const tenants = await controlPlane.tenant.findMany({
    where: { status: 'ATIVO' },
    include: { rabbitmq: true, database: true },
  });

  const workersPorTenant: WorkersTenant[] = [];
  const conexoesTenant: PrismaClient[] = [];

  for (const tenant of tenants) {
    if (!tenant.rabbitmq || !tenant.database) {
      log('info', `tenant "${tenant.slug}" sem broker ou banco configurado — ignorado`);
      continue;
    }

    const senhaBanco = encryption.decifrar({
      valor: tenant.database.databasePasswordEncrypted,
      versao: tenant.database.databaseEncryptionVersion,
    });
    const urlBanco =
      `postgresql://${encodeURIComponent(tenant.database.databaseUsername)}:${encodeURIComponent(senhaBanco)}` +
      `@${tenant.database.databaseHost}:${tenant.database.databasePort}/${tenant.database.databaseName}?schema=public`;
    const prismaTenant = new PrismaClient({ datasources: { db: { url: urlBanco } } });
    conexoesTenant.push(prismaTenant);

    const logT = (nivel: 'info' | 'erro', msg: string, extra?: unknown) =>
      log(nivel, `[${tenant.slug}] ${msg}`, extra);

    const iot = new IotWorker({
      acesso: {
        host: tenant.rabbitmq.host,
        porta: tenant.rabbitmq.porta,
        virtualHost: tenant.rabbitmq.virtualHost,
        usuario: tenant.rabbitmq.usuario,
        senha: encryption.decifrar({
          valor: tenant.rabbitmq.senhaEncrypted,
          versao: tenant.rabbitmq.encryptionVersion,
        }),
        sslHabilitado: tenant.rabbitmq.sslEnabled,
      },
      prisma: prismaTenant,
      ids,
      log: logT,
    });

    const indicadores = new IndicadoresWorker({
      prisma: prismaTenant,
      ids,
      log: logT,
    });

    const monitor = new MonitorWorker({
      prisma: prismaTenant,
      onlineDoCentro: async () => true, // FIXME: ligar ao consultor de conexões RabbitMQ.
      log: logT,
    });

    const consumoFerramenta = new CalculoConsumoFerramentaWorker({
      prisma: prismaTenant,
      log: logT,
    });

    const moverHistorico = new MoverOrdensParaHistoricoWorker({
      prisma: prismaTenant,
      log: logT,
    });

    await iot.iniciar();
    await indicadores.iniciar();
    await monitor.iniciar();
    await consumoFerramenta.iniciar();
    await moverHistorico.iniciar();

    workersPorTenant.push({ iot, indicadores, monitor, consumoFerramenta, moverHistorico });
    log('info', `workers do tenant "${tenant.slug}" iniciados`);
  }

  if (workersPorTenant.length === 0) {
    log('erro', 'nenhum tenant com broker configurado — nada a processar');
  }

  const encerrar = async (sinal: string): Promise<void> => {
    log('info', `recebido ${sinal}, encerrando`);
    await Promise.all(
      workersPorTenant.flatMap((w) => [
        w.iot.encerrar(),
        w.indicadores.encerrar(),
        w.monitor.encerrar(),
        w.consumoFerramenta.encerrar(),
        w.moverHistorico.encerrar(),
      ]),
    );
    await Promise.all(conexoesTenant.map((c) => c.$disconnect()));
    await controlPlane.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void encerrar('SIGINT'));
  process.on('SIGTERM', () => void encerrar('SIGTERM'));
}

void main().catch((err) => {
  log('erro', 'falha ao iniciar o worker', err);
  process.exit(1);
});