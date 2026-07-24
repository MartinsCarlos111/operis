import { PrismaClient } from '@prisma/client';
import { ConexaoBancoFalhouError } from '../../domain/exceptions/index.js';
import type {
  DadosConexaoBanco,
  ValidadorConexaoBanco,
} from '../../domain/gateways/validador-conexao-banco.js';
import { montarUrlPostgres } from './url-conexao.js';

/**
 * Valida a disponibilidade do banco abrindo uma conexão descartável e
 * executando SELECT 1. O client é sempre desconectado ao final — não entra
 * em nenhum pool.
 */
export class PrismaValidadorConexao implements ValidadorConexaoBanco {
  async validar(dados: DadosConexaoBanco): Promise<void> {
    const client = new PrismaClient({
      datasources: { db: { url: montarUrlPostgres(dados) } },
    });
    try {
      await client.$queryRaw`SELECT 1`;
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message.split('\n').pop() ?? 'erro desconhecido' : 'erro desconhecido';
      throw new ConexaoBancoFalhouError(motivo, { cause: erro });
    } finally {
      await client.$disconnect();
    }
  }
}
