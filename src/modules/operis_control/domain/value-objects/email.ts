import { AppError } from '@shared/errors/app-error.js';

export class EmailInvalidoError extends AppError {
  readonly code = 'EMAIL_INVALIDO';
  readonly httpStatus = 422;

  constructor(valor: string) {
    super(`"${valor}" não é um endereço de email válido`);
  }
}

/**
 * Value Object Email do contexto de administração. Cada bounded context tem o
 * seu modelo — não importamos o Email do contexto de usuários (fronteira).
 */
export class Email {
  private constructor(public readonly valor: string) {}

  static criar(bruto: string): Email {
    const normalizado = bruto.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) {
      throw new EmailInvalidoError(bruto);
    }
    return new Email(normalizado);
  }

  igual(outro: Email): boolean {
    return this.valor === outro.valor;
  }

  toString(): string {
    return this.valor;
  }
}
