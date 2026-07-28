import { AppError } from '@shared/errors/app-error.js';

/** Paridade com ImpressoraRN: "Id impressora X não encontrado." */
export class ImpressoraNaoEncontradaError extends AppError {
  readonly code = 'IMPRESSORA_NAO_ENCONTRADA';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Impressora "${identificador}" não foi encontrada`);
  }
}
