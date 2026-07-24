import { EmailInvalidoError } from '../exceptions/email-invalido.error.js';

/**
 * Value Object Email. Imutável, autovalidável, comparado por valor.
 * Se um Email existe na aplicação, ele é garantidamente válido — o construtor
 * rejeita o inválido. Normaliza (lowercase/trim) para evitar duplicatas por grafia.
 */
export class Email {
  private constructor(public readonly valor: string) {}

  static criar(bruto: string): Email {
    const normalizado = bruto.trim().toLowerCase();
    if (!Email.ehValido(normalizado)) {
      throw new EmailInvalidoError(bruto);
    }
    return new Email(normalizado);
  }

  private static ehValido(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  }

  igual(outro: Email): boolean {
    return this.valor === outro.valor;
  }

  toString(): string {
    return this.valor;
  }
}
