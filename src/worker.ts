import { createPrismaClient } from '@shared/infra/prisma/prisma-client.js';
import { CryptoGeradorId } from '@shared/infra/gateways/crypto-gerador-id.js';
import { AesGcmEncryptionService } from '@modules/operis_control/infrastructure/gateways/aes-gcm-encryption.service.js';
import { IotWorker, type LogWorker } from '@modules/iot/worker/iot-worker.js';
import { PrismaClient } from '@prisma/client';

/**
 * Processo do worker de ingestão IoT. Sobe um consumidor por tenant que tenha
 * broker configurado, cada um ligado ao banco dedicado daquele tenant.
 *
 * Separado da API de propósito: consumo AMQP é conexão de longa duração e não
 * pode disputar o event loop que atende as rotas HTTP.
 *
 *   npm run worker
 */
const log: LogWorker = (nivel, msg, extra) => {
  const linha = `[${new Date().toISOString()}] ${nivel.toUpperCase()} ${msg}`;
  if (nivel === 'erro') console.error(linha, extra ?? '');
  else console.log(linha);
};

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

  const workers: IotWorker[] = [];
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

    const worker = new IotWorker({
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
      log: (nivel, msg, extra) => log(nivel, `[${tenant.slug}] ${msg}`, extra),
    });

    await worker.iniciar();
    workers.push(worker);
    log('info', `worker do tenant "${tenant.slug}" iniciado`);
  }

  if (workers.length === 0) {
    log('erro', 'nenhum tenant com broker configurado — nada a consumir');
  }

  const encerrar = async (sinal: string): Promise<void> => {
    log('info', `recebido ${sinal}, encerrando`);
    await Promise.all(workers.map((w) => w.encerrar()));
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
