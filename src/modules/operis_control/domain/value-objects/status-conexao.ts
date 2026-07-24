/**
 * Situação operacional da conexão com o banco dedicado de um tenant.
 * Espelha o enum StatusConexao do Prisma.
 */
export const StatusConexao = {
  PROVISIONANDO: 'PROVISIONANDO',
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  ERRO: 'ERRO',
} as const;

export type StatusConexao = (typeof StatusConexao)[keyof typeof StatusConexao];
