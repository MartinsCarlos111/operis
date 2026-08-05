import { AppError } from '@shared/errors/app-error.js';

/**
 * Exceções do contexto de manufatura, agrupadas por serem variações do mesmo
 * par (não encontrado / código duplicado) sobre seis agregados — um arquivo por
 * classe aqui só produziria ruído. As mensagens preservam literalmente as do
 * CentroTrabalhoRN quando existem no legado.
 */

export class CalendarioNaoEncontradoError extends AppError {
  readonly code = 'CALENDARIO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Código calendário '${identificador}' não cadastrado.`);
  }
}

export class CodigoCalendarioJaExisteError extends AppError {
  readonly code = 'CODIGO_CALENDARIO_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Calendário com o código '${codigo}' já cadastrado.`);
  }
}

export class CalendarioEmUsoError extends AppError {
  readonly code = 'CALENDARIO_EM_USO';
  readonly httpStatus = 409;

  constructor(codigo: string, quantidade: number) {
    super(
      `Não foi possível excluir o calendário '${codigo}', há '${quantidade}' centros de trabalho relacionados.`,
    );
  }
}

export class ReservaNaoEncontradaError extends AppError {
  readonly code = 'RESERVA_NAO_ENCONTRADA';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Reserva '${identificador}' não está cadastrada.`);
  }
}

export class ReservaJaExisteError extends AppError {
  readonly code = 'RESERVA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(itemCodigo: string, sequencia: number) {
    super(
      `Já existe uma reserva do item '${itemCodigo}' com a sequência '${sequencia}' nesta ordem.`,
    );
  }
}

/**
 * Paridade com ReservaRN.ValidarStatusOrdemReserva. A mensagem preserva o
 * tratamento especial de BAIXADA, que no legado vira "Baixada em um Centro de
 * Trabalho" em vez do nome cru do enum.
 */
export class OrdemProducaoBloqueiaReservaError extends AppError {
  readonly code = 'ORDEM_PRODUCAO_BLOQUEIA_RESERVA';
  readonly httpStatus = 422;

  constructor(statusOrdem: string) {
    const rotulo =
      statusOrdem === 'BAIXADA' ? 'Baixada em um Centro de Trabalho' : rotularStatus(statusOrdem);
    super(
      `A Ordem de Produção está ${rotulo}. Não será possível adicionar ou alterar suas reservas.`,
    );
  }
}

/** CANCELADA → "Cancelada" (o legado imprimia o nome do enum C#, capitalizado). */
function rotularStatus(status: string): string {
  const minusculo = status.toLowerCase();
  return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
}

export class TurnoNaoEncontradoError extends AppError {
  readonly code = 'TURNO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Código Turno '${identificador}' não cadastrado.`);
  }
}

export class CodigoTurnoJaExisteError extends AppError {
  readonly code = 'CODIGO_TURNO_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Turno com o código '${codigo}' já cadastrado neste calendário.`);
  }
}

export class GrupoMaquinaNaoEncontradoError extends AppError {
  readonly code = 'GRUPO_MAQUINA_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Código grupo de máquina '${identificador}' não cadastrado.`);
  }
}

export class CodigoGrupoMaquinaJaExisteError extends AppError {
  readonly code = 'CODIGO_GRUPO_MAQUINA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Grupo de máquina com o código '${codigo}' já cadastrado.`);
  }
}

export class GrupoMaquinaEmUsoError extends AppError {
  readonly code = 'GRUPO_MAQUINA_EM_USO';
  readonly httpStatus = 409;

  constructor(codigo: string, quantidade: number) {
    super(
      `Não foi possível excluir o grupo de máquina '${codigo}', há '${quantidade}' centros de trabalho relacionados.`,
    );
  }
}

export class CentroTrabalhoNaoEncontradoError extends AppError {
  readonly code = 'CENTRO_TRABALHO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Centro de Trabalho com o id '${identificador}' não encontrado.`);
  }
}

export class CodigoCentroTrabalhoJaExisteError extends AppError {
  readonly code = 'CODIGO_CENTRO_TRABALHO_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Centro de Trabalho com o código '${codigo}' já cadastrado.`);
  }
}

/**
 * Paridade com CentroTrabalhoRN.ValidarCentroTrabalho: o estabelecimento do
 * calendário precisa ter o produto Manufatura habilitado. No operis isso é o
 * campo `manufatura` (StatusRecurso) do Estabelecimento.
 */
export class EstabelecimentoSemManufaturaError extends AppError {
  readonly code = 'ESTABELECIMENTO_SEM_MANUFATURA';
  readonly httpStatus = 422;

  constructor(identificador: string) {
    super(`Estabelecimento '${identificador}' não possui o produto manufatura.`);
  }
}

export class EstabelecimentoInativoError extends AppError {
  readonly code = 'ESTABELECIMENTO_INATIVO';
  readonly httpStatus = 422;

  constructor(identificador: string) {
    super(`Estabelecimento '${identificador}' não está ativo.`);
  }
}
