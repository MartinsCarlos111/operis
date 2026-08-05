import type { PrismaClient } from '@prisma/client';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { RegistrarMovimentoIotUseCase } from '../application/use-cases/registrar-movimento-iot.use-case.js';
import { PrismaDispositivoIotRepository } from '../infrastructure/persistence/prisma-dispositivo-iot.repository.js';
import { PrismaLeituraIotRepository } from '../infrastructure/persistence/prisma-leitura-iot.repository.js';
import {
  AmqpConsumidorMensagens,
  type AcessoAmqp,
  type OpcoesConsumidorAmqp,
} from '../infrastructure/gateways/amqp-consumidor-mensagens.js';
import { extrairMovimentos } from '../infrastructure/gateways/parser-moviment.js';

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
 */
export class IotWorker {
  private readonly consumidor: AmqpConsumidorMensagens;
  private readonly registrar: RegistrarMovimentoIotUseCase;
  private readonly log: LogWorker;

  constructor(opcoes: OpcoesWorkerIot) {
    this.log = opcoes.log ?? (() => {});
    this.consumidor = new AmqpConsumidorMensagens(
      opcoes.acesso,
      opcoes.consumidor ?? {},
      this.log,
    );
    this.registrar = new RegistrarMovimentoIotUseCase(
      new PrismaDispositivoIotRepository(opcoes.prisma),
      new PrismaLeituraIotRepository(opcoes.prisma),
      opcoes.ids,
    );
  }

  async iniciar(): Promise<void> {
    await this.consumidor.consumir(async (mensagem) => {
      const movimentos = extrairMovimentos(mensagem);
      if (movimentos.length === 0) {
        // REGISTER/REPORT/UPDATE são controle: reconhecidos e ignorados.
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
