import { randomUUID } from 'node:crypto';
import type { GeradorId } from '@shared/domain/gerador-id.js';

/** Adaptador de GeradorId usando o módulo crypto do Node — sem dependência externa. */
export class CryptoGeradorId implements GeradorId {
  gerar(): string {
    return randomUUID();
  }
}
