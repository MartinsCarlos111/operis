import type { PrismaClient } from '@prisma/client';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { RegistrarMovimentoIotUseCase } from '../application/use-cases/registrar-movimento-iot.use-case.js';
import { RegistrarDispositivoIotUseCase } from '../application/use-cases/registrar-dispositivo-iot.use-case.js';
import { DespacharAtualizacaoFirmwareUseCase } from '../application/use-cases/despachar-atualizacao-firmware.use-case.js';
import { PrismaDispositivoIotRepository } from '../infrastructure/persistence/prisma-dispositivo-iot.repository.js';
import { PrismaLeituraIotRepository } from '../infrastructure/persistence/prisma-leitura-iot.repository.js';
import { PrismaFalhaLeituraIotRepository } from '../infrastructure/persistence/prisma-falha-leitura-iot.repository.js';
import { PrismaAtualizacaoFirmwareRepository } from '../infrastructure/persistence/prisma-atualizacao-firmware.repository.js';
import {
  PrismaDispositivoIotCompatibilidade,
} from '../infrastructure/gateways/prisma-dispositivo-iot-compatibilidade.js';
import {
  AmqpConsumidorMensagens,
  type AcessoAmqp,
  type OpcoesConsumidorAmqp,
} from '../infrastructure/gateways/amqp-consumidor-mensagens.js';
import {
  extrairMovimentos,
  extrairRegisterPayload,
} from '../infrastructure/gateways/parser-moviment.js';

export type LogWorker = (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void;

export interface OpcoesWorkerIot {
  acesso: AcessoAmqp;
  prisma: PrismaClient;
  ids: GeradorId;
  consumidor?: OpcoesConsumidorAmqp;
  log?: LogWorker;
}

/**
 * Worker de ingestão das leituras dos coletores.
 *
 * Roda como PROCESSO SEPARADO da API: consumo AMQP é uma conexão de longa
 * duração com prefetch e ack manual, que não encaixa no ciclo
 * request/response do Fastify e competiria com o event loop das rotas.
 *
 * Um worker por tenant — cada tenant tem broker e banco dedicados.
 *
 * Despacho por MessageType (paridade com `MaquinaConsumer.ConsumeMessage`):
 *   - MOVIMENT : registra leituras (crus) → `LeituraIot`
 *   - REGISTER : reconcilia `DispositivoIot` (modelo/versaoFirmware/ip)
 *   - UPDATE*  : despacha o ciclo `AtualizacaoFirmwareIot` (OTA)
 *   - REPORT/CONFIGURATION : controle — reconhecidos e logados.
 */
export class IotWorker {
  private readonly consumidor: AmqpConsumidorMensagens;
  private readonly registrar: RegistrarMovimentoIotUseCase;
  private readonly registrarDispositivo: RegistrarDispositivoIotUseCase;
  private readonly despacharOta: DespacharAtualizacaoFirmwareUseCase;
  private readonly log: LogWorker;

  constructor(opcoes: OpcoesWorkerIot) {
    this.log = opcoes.log ?? (() => {});
    this.consumidor = new AmqpConsumidorMensagens(
      opcoes.acesso,
      opcoes.consumidor ?? {},
      this.log,
    );

    const dispositivosRepo = new PrismaDispositivoIotRepository(opcoes.prisma);
    const dispositivosCompat = new PrismaDispositivoIotCompatibilidade(opcoes.prisma);
    const atualizacoesRepo = new PrismaAtualizacaoFirmwareRepository(opcoes.prisma);

    this.registrar = new RegistrarMovimentoIotUseCase(
      dispositivosRepo,
      new PrismaLeituraIotRepository(opcoes.prisma),
      new PrismaFalhaLeituraIotRepository(opcoes.prisma),
      opcoes.ids,
    );
    this.registrarDispositivo = new RegistrarDispositivoIotUseCase(dispositivosCompat);
    this.despacharOta = new DespacharAtualizacaoFirmwareUseCase(
      atualizacoesRepo,
      async (serial) => (await dispositivosRepo.buscarPorSerial(serial))?.idDispositivoIot ?? null,
      (msg, extra) => this.log('info', msg, extra),
    );
  }

  async iniciar(): Promise<void> {
    await this.consumidor.consumir(async (mensagem) => {
      // Dispatch por tipo — paridade com `MaquinaConsumer`.
      if (mensagem.tipo === 'REGISTER') {
        try {
          const payload = extrairRegisterPayload(mensagem);
          await this.registrarDispositivo.executar(mensagem.serial, payload);
          this.log('info', `${mensagem.serial}: REGISTER reconciliado (versão ${payload.version}).`);
        } catch (err) {
          this.log('erro', `REGISTER de ${mensagem.serial} recusado: ${(err as Error).message}`);
        }
        return;
      }

      if (
        mensagem.tipo === 'UPDATE' ||
        mensagem.tipo === 'UPDATESTARTED' ||
        mensagem.tipo === 'UPDATECOMPLETED' ||
        mensagem.tipo === 'UPDATEFAILED'
      ) {
        try {
          await this.despacharOta.executar(mensagem);
        } catch (err) {
          this.log('erro', `OTA ${mensagem.tipo} de ${mensagem.serial}: ${(err as Error).message}`);
        }
        return;
      }

      const movimentos = extrairMovimentos(mensagem);
      if (movimentos.length === 0) {
        this.log('info', `mensagem ${mensagem.tipo} de ${mensagem.serial} ignorada (sem leitura)`);
        return;
      }

      const resultado = await this.registrar.executar(movimentos);
      this.log(
        'info',
        `${mensagem.serial}: ${resultado.registradas} leitura(s) gravada(s)` +
          (resultado.descartadas.length > 0
            ? `, ${resultado.descartadas.length} descartada(s)`
            : ''),
      );
      for (const d of resultado.descartadas) {
        this.log('erro', `descartado serial=${d.serial} input=${d.input}: ${d.motivo}`);
      }
    });
  }

  async encerrar(): Promise<void> {
    await this.consumidor.encerrar();
  }
}
