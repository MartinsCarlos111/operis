import { AppError } from '@shared/errors/app-error.js';

export class SlugJaExisteError extends AppError {
  readonly code = 'SLUG_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(slug: string) {
    super(`Já existe um tenant com o slug "${slug}"`);
  }
}

export class TenantNaoEncontradoError extends AppError {
  readonly code = 'TENANT_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Tenant "${identificador}" não foi encontrado`);
  }
}

export class EmailJaEmUsoError extends AppError {
  readonly code = 'EMAIL_JA_EM_USO';
  readonly httpStatus = 409;

  constructor(email: string) {
    super(`O email "${email}" já está em uso`);
  }
}

/** Login falhou — mensagem única propositalmente (não revela se o email existe). */
export class CredenciaisInvalidasError extends AppError {
  readonly code = 'CREDENCIAIS_INVALIDAS';
  readonly httpStatus = 401;

  constructor() {
    super('Email ou senha inválidos');
  }
}

export class ConexaoBancoFalhouError extends AppError {
  readonly code = 'CONEXAO_BANCO_FALHOU';
  readonly httpStatus = 422;

  constructor(motivo: string, options?: { cause?: unknown }) {
    super(`Não foi possível conectar ao banco informado: ${motivo}`, options);
  }
}

export class BrokerInacessivelError extends AppError {
  readonly code = 'BROKER_INACESSIVEL';
  readonly httpStatus = 422;

  constructor(motivo: string, options?: { cause?: unknown }) {
    super(`Não foi possível consultar o broker de mensageria: ${motivo}`, options);
  }
}
