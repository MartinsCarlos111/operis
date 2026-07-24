import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ConexaoBancoFalhouError } from '../../domain/exceptions/index.js';
import type { DadosConexaoBanco } from '../../domain/gateways/validador-conexao-banco.js';
import type { ProvisionadorSchemaTenant } from '../../domain/gateways/provisionador-schema-tenant.js';
import { montarUrlPostgres } from './url-conexao.js';

const execFileAsync = promisify(execFile);

/**
 * Aplica o schema da aplicação no banco dedicado do tenant via
 * `prisma db push` apontado para a URL do tenant. A URL (com senha) vai só
 * na env do processo filho — nunca em argv (visível em listagem de processos).
 */
export class PrismaProvisionadorSchema implements ProvisionadorSchemaTenant {
  async provisionar(dados: DadosConexaoBanco): Promise<void> {
    try {
      await execFileAsync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
        env: { ...process.env, DATABASE_URL: montarUrlPostgres(dados) },
        shell: process.platform === 'win32',
        timeout: 120_000,
      });
    } catch (erro) {
      throw new ConexaoBancoFalhouError('falha ao aplicar o schema no banco do tenant', {
        cause: erro,
      });
    }
  }
}
