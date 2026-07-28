import { AppError } from '@shared/errors/app-error.js';

export class VariavelLayoutNaoEncontradaError extends AppError {
  readonly code = 'VARIAVEL_LAYOUT_NAO_ENCONTRADA';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Variável de layout "${id}" não foi encontrada`);
  }
}

/** Paridade: "Variável com o código X já cadastrado." */
export class CodigoVariavelJaExisteError extends AppError {
  readonly code = 'CODIGO_VARIAVEL_JA_EXISTE';
  readonly httpStatus = 409;
  constructor(codigo: string) {
    super(`Variável com o código '${codigo}' já cadastrado.`);
  }
}

export class LayoutEtiquetaNaoEncontradoError extends AppError {
  readonly code = 'LAYOUT_ETIQUETA_NAO_ENCONTRADO';
  readonly httpStatus = 404;
  constructor(id: string) {
    super(`Layout de etiqueta "${id}" não foi encontrado`);
  }
}

export class CodigoLayoutJaExisteError extends AppError {
  readonly code = 'CODIGO_LAYOUT_JA_EXISTE';
  readonly httpStatus = 409;
  constructor(codigo: string) {
    super(`Layout com o código '${codigo}' já cadastrado.`);
  }
}
