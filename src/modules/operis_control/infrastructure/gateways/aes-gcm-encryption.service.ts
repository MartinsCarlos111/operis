import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EncryptionService, SegredoCifrado } from '../../domain/gateways/encryption-service.js';

const VERSAO_ATUAL = 1;
const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12; // recomendado para GCM
const TAMANHO_CHAVE = 32; // 256 bits

/**
 * AES-256-GCM com chave mestra de variável de ambiente (ENCRYPTION_MASTER_KEY,
 * 32 bytes em base64). Formato do payload: `v1$iv$authTag$ciphertext` (base64).
 * GCM é autenticado: alterar qualquer byte do registro invalida a decifragem —
 * proteção contra adulteração do banco do Control Plane.
 */
export class AesGcmEncryptionService implements EncryptionService {
  private readonly chave: Buffer;

  constructor(chaveMestraBase64: string) {
    const chave = Buffer.from(chaveMestraBase64, 'base64');
    if (chave.length !== TAMANHO_CHAVE) {
      throw new Error(
        `ENCRYPTION_MASTER_KEY inválida: esperados ${TAMANHO_CHAVE} bytes em base64, recebidos ${chave.length}`,
      );
    }
    this.chave = chave;
  }

  cifrar(textoPuro: string): SegredoCifrado {
    const iv = randomBytes(TAMANHO_IV);
    const cipher = createCipheriv(ALGORITMO, this.chave, iv);
    const cifrado = Buffer.concat([cipher.update(textoPuro, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      valor: `v${VERSAO_ATUAL}$${iv.toString('base64')}$${authTag.toString('base64')}$${cifrado.toString('base64')}`,
      versao: VERSAO_ATUAL,
    };
  }

  decifrar(cifrado: SegredoCifrado): string {
    const partes = cifrado.valor.split('$');
    if (partes.length !== 4 || partes[0] !== `v${VERSAO_ATUAL}`) {
      throw new Error(`Payload cifrado em formato/versão não suportado (esperado v${VERSAO_ATUAL})`);
    }
    const [, ivB64, tagB64, cipherB64] = partes;
    const decipher = createDecipheriv(ALGORITMO, this.chave, Buffer.from(ivB64!, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64!, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(cipherB64!, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
