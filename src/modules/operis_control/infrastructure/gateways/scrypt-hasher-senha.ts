import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { HasherSenha } from '../../domain/gateways/hasher-senha.js';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const TAMANHO_SALT = 16;
const TAMANHO_HASH = 64;

/**
 * Hash de senha com scrypt (node:crypto) — sem dependência nativa externa.
 * Formato: `scrypt$salt_base64$hash_base64`. Comparação em tempo constante.
 */
export class ScryptHasherSenha implements HasherSenha {
  async gerarHash(senha: string): Promise<string> {
    const salt = randomBytes(TAMANHO_SALT);
    const hash = await scryptAsync(senha, salt, TAMANHO_HASH);
    return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
  }

  async verificar(senha: string, hashArmazenado: string): Promise<boolean> {
    const partes = hashArmazenado.split('$');
    if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
    const salt = Buffer.from(partes[1]!, 'base64');
    const esperado = Buffer.from(partes[2]!, 'base64');
    const calculado = await scryptAsync(senha, salt, esperado.length);
    return timingSafeEqual(esperado, calculado);
  }
}
