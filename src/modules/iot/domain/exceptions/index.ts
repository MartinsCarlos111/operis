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

export class VersaoFirmwareJaExisteError extends AppError {
  readonly code = 'VERSAO_FIRMWARE_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(modelo: number, versao: string) {
    super(`Já existe firmware do modelo ${modelo} com a versão "${versao}"`);
  }
}

export class FirmwareNaoEncontradoError extends AppError {
  readonly code = 'FIRMWARE_NAO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(identificador: string) {
    super(`Firmware "${identificador}" não foi encontrado`);
  }
}

export class AtualizacaoFirmwareEmCursoError extends AppError {
  readonly code = 'ATUALIZACAO_FIRMWARE_EM_CURSO';
  readonly httpStatus = 409;

  constructor(dispositivoId: string) {
    super(`Dispositivo "${dispositivoId}" já tem uma atualização de firmware em curso`);
  }
}
