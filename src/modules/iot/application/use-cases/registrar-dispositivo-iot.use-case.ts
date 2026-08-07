import { AppError } from '@shared/errors/app-error.js';
import type { DispositivoIotCompatibilidade } from '../../infrastructure/gateways/prisma-dispositivo-iot-compatibilidade.js';

/** Envelope de payload REGISTER do protocolo IoT (paridade Octopus `RegisterModel`). */
export interface PayloadRegisterIot {
  model: number | string;
  version: string;
  ip?: string | undefined;
}

/** Erro: REGISTER desconhecido não resolve estabelecimento — não pode autocadastrar. */
export class DispositivoIotDesconhecidoError extends AppError {
  readonly code = 'DISPOSITIVO_IOT_DESCONHECIDO';
  readonly httpStatus = 404;

  constructor(serial: string) {
    super(`Dispositivo IoT '${serial}' não cadastrado (Register recebido sem cadastro prévio).`);
  }
}

/**
 * Processa a mensagem REGISTER (paridade com `MaquinaConsumer.ProcessaCadastroIOT`).
 *
 * DIFERENÇA DELIBERADA vs legado: o legado CRIAVA o dispositivo ao receber
 * REGISTER de um serial desconhecido. Aqui o dispositivo precisa existir
 * previamente — o inventário físico deve ser controlado por um cadastro
 * humano; autocadastro automático abriria brecha para um dispositivo
 * arbitrário publicar na fila do tenant.
 *
 * REGISTER reconcilia: atualiza `modelo`, `versaoFirmware` e `ip` do cadastro
 * a partir do que o aparelho reportou. Não há mudança de identidade (serial).
 */
export class RegistrarDispositivoIotUseCase {
  constructor(private readonly dispositivos: DispositivoIotCompatibilidade) {}

  async executar(serial: string, payload: PayloadRegisterIot): Promise<void> {
    const disp = await this.dispositivos.buscarPorSerial(serial);
    if (!disp) throw new DispositivoIotDesconhecidoError(serial);

    await this.dispositivos.salvarCompatibilidade({
      idDispositivoIot: disp.idDispositivoIot,
      modelo: typeof payload.model === 'string' ? Number(payload.model) : payload.model,
      versaoFirmware: payload.version,
      ip: payload.ip,
    });
  }
}