import { describe, it, expect } from 'vitest';
import { AesGcmEncryptionService } from './aes-gcm-encryption.service.js';

const CHAVE_VALIDA = Buffer.alloc(32, 1).toString('base64');

describe('AesGcmEncryptionService', () => {
  it('cifra e decifra (roundtrip), sem expor o texto puro no payload', () => {
    const service = new AesGcmEncryptionService(CHAVE_VALIDA);
    const segredo = 'senha-do-banco-do-tenant#2024!';

    const cifrado = service.cifrar(segredo);

    expect(cifrado.valor).not.toContain(segredo);
    expect(cifrado.valor.startsWith('v1$')).toBe(true);
    expect(cifrado.versao).toBe(1);
    expect(service.decifrar(cifrado)).toBe(segredo);
  });

  it('produz payloads diferentes para o mesmo texto (IV aleatório)', () => {
    const service = new AesGcmEncryptionService(CHAVE_VALIDA);
    const a = service.cifrar('mesma-senha');
    const b = service.cifrar('mesma-senha');
    expect(a.valor).not.toBe(b.valor);
  });

  it('rejeita payload adulterado (autenticação do GCM)', () => {
    const service = new AesGcmEncryptionService(CHAVE_VALIDA);
    const cifrado = service.cifrar('segredo');

    // Corrompe o último caractere do ciphertext.
    const adulterado = {
      ...cifrado,
      valor: cifrado.valor.slice(0, -2) + (cifrado.valor.endsWith('A') ? 'BB' : 'AA'),
    };

    expect(() => service.decifrar(adulterado)).toThrow();
  });

  it('rejeita decifrar com outra chave mestra', () => {
    const serviceA = new AesGcmEncryptionService(CHAVE_VALIDA);
    const serviceB = new AesGcmEncryptionService(Buffer.alloc(32, 2).toString('base64'));

    const cifrado = serviceA.cifrar('segredo');
    expect(() => serviceB.decifrar(cifrado)).toThrow();
  });

  it('rejeita chave mestra com tamanho errado', () => {
    expect(() => new AesGcmEncryptionService(Buffer.alloc(16, 1).toString('base64'))).toThrow(
      /32 bytes/,
    );
  });
});
