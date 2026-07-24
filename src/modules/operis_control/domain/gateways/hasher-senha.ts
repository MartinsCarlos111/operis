/**
 * Porta de hash de senha para autenticação (super-admins e administradores de
 * tenant). Hash é irreversível — diferente do EncryptionService, que cifra a
 * senha do BANCO do tenant porque esta precisa ser recuperada para conectar.
 */
export interface HasherSenha {
  gerarHash(senha: string): Promise<string>;
  verificar(senha: string, hash: string): Promise<boolean>;
}
