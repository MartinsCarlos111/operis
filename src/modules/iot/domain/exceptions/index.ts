import { AppError } from '@shared/errors/app-error.js';

export class DispositivoIotNaoEncontradoError extends AppError {
  readonly code = 'DISPOSITIVO_IOT_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Dispositivo IoT "${identificador}" não foi encontrado`);
  }
}

export class SerialIotJaExisteError extends AppError {
  readonly code = 'SERIAL_IOT_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(serial: string) {
    super(`Já existe um dispositivo IoT com o serial "${serial}"`);
  }
}

export class EstabelecimentoNaoEncontradoError extends AppError {
  readonly code = 'ESTABELECIMENTO_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(estabelecimentoId: string) {
    super(`Estabelecimento "${estabelecimentoId}" não foi encontrado`);
  }
}

export class EstabelecimentoInativoError extends AppError {
  readonly code = 'ESTABELECIMENTO_INATIVO';
  readonly httpStatus = 422;

  constructor(estabelecimentoId: string) {
    super(`Estabelecimento "${estabelecimentoId}" está inativo`);
  }
}
