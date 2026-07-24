/**
 * Dados de conexão prontos para abrir um pool no banco dedicado do tenant —
 * senha JÁ decifrada, só em memória. É a saída do TenantResolver e a entrada
 * da PrismaFactory.
 */
export interface DadosConexaoTenant {
  host: string;
  porta: number;
  nomeBanco: string;
  usuario: string;
  /** Texto puro — existe apenas em memória, nunca é logado nem persistido. */
  senha: string;
  sslHabilitado: boolean;
}

/**
 * Porta do Connection Manager para o Control Plane. O runtime não conhece a
 * estrutura do banco de administração: delega ao resolver "dado um tenantId,
 * me devolva a configuração de conexão pronta (com a senha já decifrada)".
 *
 * A implementação concreta (que junta TenantRepository + EncryptionService)
 * vive fora daqui e é injetada no composition root — assim shared/ não importa
 * internals de nenhum módulo (regra no-cross-feature-internals).
 */
export interface TenantResolver {
  /** Resolve a config do tenant. Retorna null se o tenant/banco não existe. */
  resolver(tenantId: string): Promise<DadosConexaoTenant | null>;
}

/** Lançado quando não há configuração de banco para o tenantId informado. */
export class TenantNaoResolvidoError extends Error {
  constructor(public readonly tenantId: string) {
    super(`Nenhuma configuração de banco encontrada para o tenant "${tenantId}"`);
    this.name = 'TenantNaoResolvidoError';
  }
}
