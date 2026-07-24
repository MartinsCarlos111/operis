import type { DadosConexaoBanco } from '../../domain/gateways/validador-conexao-banco.js';

/**
 * Monta a URL de conexão Postgres a partir dos dados (senha em texto puro,
 * só em memória). Usuário/senha são URL-encoded — senhas com caracteres
 * especiais não podem quebrar a URL.
 */
export function montarUrlPostgres(dados: DadosConexaoBanco): string {
  const usuario = encodeURIComponent(dados.usuario);
  const senha = encodeURIComponent(dados.senha);
  const ssl = dados.sslHabilitado ? '&sslmode=require' : '';
  return `postgresql://${usuario}:${senha}@${dados.host}:${dados.porta}/${dados.nomeBanco}?schema=public${ssl}`;
}
