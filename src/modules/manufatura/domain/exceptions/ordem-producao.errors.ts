import { AppError } from '@shared/errors/app-error.js';

export class OrdemProducaoNaoEncontradaError extends AppError {
  readonly code = 'ORDEM_PRODUCAO_NAO_ENCONTRADA'; readonly httpStatus = 404;
  constructor(id: string) { super(`Ordem de produção '${id}' não encontrada.`); }
}
export class OrdemProducaoDuplicadaError extends AppError {
  readonly code = 'ORDEM_PRODUCAO_DUPLICADA'; readonly httpStatus = 409;
  constructor(codigo: string, identificador: string) { super(`A ordem '${codigo}/${identificador}' já está cadastrada.`); }
}
