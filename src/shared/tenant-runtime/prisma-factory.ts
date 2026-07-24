import { PrismaClient } from '@prisma/client';
import type { DadosConexaoTenant } from './tenant-resolver.js';

/**
 * Monta a URL Postgres do tenant. Usuário/senha são URL-encoded para não
 * quebrar a URL com caracteres especiais. Espelha a lógica usada no
 * provisionamento (montarUrlPostgres do Control Plane), replicada aqui para o
 * runtime não depender de internals de outro módulo.
 */
export function montarUrlTenant(dados: DadosConexaoTenant): string {
  const usuario = encodeURIComponent(dados.usuario);
  const senha = encodeURIComponent(dados.senha);
  const ssl = dados.sslHabilitado ? '&sslmode=require' : '';
  return `postgresql://${usuario}:${senha}@${dados.host}:${dados.porta}/${dados.nomeBanco}?schema=public${ssl}`;
}

/**
 * Fábrica centralizada de PrismaClient para bancos de tenant. A aplicação
 * nunca instancia PrismaClient direto para um tenant — passa sempre por aqui,
 * garantindo que SSL, URL e pool sejam configurados de um jeito só.
 */
export interface PrismaFactory {
  criar(dados: DadosConexaoTenant): PrismaClient;
}

export class PrismaFactoryPadrao implements PrismaFactory {
  criar(dados: DadosConexaoTenant): PrismaClient {
    return new PrismaClient({
      datasources: { db: { url: montarUrlTenant(dados) } },
    });
  }
}
