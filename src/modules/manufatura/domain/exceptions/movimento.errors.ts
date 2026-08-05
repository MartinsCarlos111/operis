import { AppError } from '@shared/errors/app-error.js';
import type { TipoMovimento } from '../entities/movimento.js';

export class MovimentoNaoEncontradoError extends AppError {
  readonly code = 'MOVIMENTO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Movimento '${identificador}' não encontrado.`);
  }
}

/** Paridade com "Centro Trabalho 'X' não está ativo." (só no site). */
export class CentroTrabalhoInativoError extends AppError {
  readonly code = 'CENTRO_TRABALHO_INATIVO';
  readonly httpStatus = 422;

  constructor(codigo: string) {
    super(`Centro Trabalho '${codigo}' não está ativo.`);
  }
}

/** Paridade com "Código Parada 'X' não cadastrado." e variantes. */
export class TipoNaoCadastradoError extends AppError {
  readonly code = 'TIPO_NAO_CADASTRADO';
  readonly httpStatus = 422;

  constructor(rotulo: string, codigo: string) {
    super(`Código ${rotulo} '${codigo}' não cadastrado.`);
  }
}

/**
 * Não-paralelismo: o legado resolve isso lendo `BuscarMovimentoAberto` antes de
 * abrir outro; aqui vira uma recusa explícita, para o erro aparecer no terminal
 * em vez de gerar dois movimentos abertos silenciosamente.
 */
export class MovimentoJaAbertoError extends AppError {
  readonly code = 'MOVIMENTO_JA_ABERTO';
  readonly httpStatus = 409;

  constructor(tipoAberto: TipoMovimento, idMovimento: string) {
    super(
      `Já existe um movimento do tipo '${tipoAberto}' em aberto neste centro de trabalho (${idMovimento}). Encerre-o antes de abrir outro.`,
    );
  }
}
