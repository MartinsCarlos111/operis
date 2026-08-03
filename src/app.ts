import { buildApp } from './app.js';
import { createPrismaClient } from '@shared/infra/prisma/prisma-client.js';

/**
 * Ponto de entrada do processo. Lê o ambiente, cria as dependências reais,
 * sobe o servidor e faz o shutdown gracioso. Nada acima deste arquivo conhece
 * process.env ou a rede — é isso que mantém o resto testável.
 */
async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET não definido — configure no .env');
    process.exit(1);
  }
  const chaveMestraCriptografia = process.env.ENCRYPTION_MASTER_KEY;
  if (!chaveMestraCriptografia) {
    console.error('ENCRYPTION_MASTER_KEY não definida — gere com: openssl rand -base64 32');
    process.exit(1);
  }

  const prisma = createPrismaClient(process.env.DATABASE_URL);
  const { app, connectionManager } = buildApp({ prisma, jwtSecret, chaveMestraCriptografia });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`recebido ${signal}, encerrando`);
    await app.close();
    await connectionManager.encerrar();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
