import type { PrismaClient } from '@prisma/client';
import type { LogWorker } from '@modules/iot/worker/iot-worker.js';
import { IntegrarMovimentosErpUseCase } from '../application/use-cases/integracao-erp.use-cases.js';
import type { ClienteSoapErp } from '../domain/gateways/cliente-soap.js';

export interface OpcoesGerenciarConcluirOrdensErpWorker {
  prisma: PrismaClient;
  cliente: ClienteSoapErp;
  intervaloMs?: number;
  log?: LogWorker;
}

/**
 * Worker que periodicamente tenta concluir/movimentar integração ERP das
 * ordens/movimentos pendentes — paridade com o loop `GerenciarConcluirOrdensERP`
 * do legado que tinha dois modos (PREFERENCIAL/BALANCEADO).
 *
 * Tick a cada 60s (default). Tenta em lotes pequenos: erro ERP num lote
 * não aborta os próximos.
 */
export class GerenciarConcluirOrdensErpWorker {
  private readonly intervaloMs: number;
  private readonly prisma: PrismaClient;
  private readonly cliente: ClienteSoapErp;
  private readonly useCase: IntegrarMovimentosErpUseCase;
  private readonly log: LogWorker;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rodando = false;

  constructor(opcoes: OpcoesGerenciarConcluirOrdensErpWorker) {
    this.prisma = opcoes.prisma;
    this.cliente = opcoes.cliente;
    this.intervaloMs = opcoes.intervaloMs ?? 60_000;
    this.log = opcoes.log ?? (() => {});
    this.useCase = new IntegrarMovimentosErpUseCase(this.cliente, {
      lerNaoIntegrados: async (estabelecimentoId: string) => {
        const rows = await this.prisma.movimento.findMany({
          where: {
            reportaErp: true,
            dataIntegracao: null,
            cancelado: false,
            centroTrabalho: { estabelecimentoId },
          },
          take: 100,
          select: { idMovimento: true, tipo: true, inicio: true } as never,
        });
        return (rows as unknown as ReadonlyArray<{ idMovimento: string; tipo: string; inicio: Date }>).map((r) => ({
          idMovimento: r.idMovimento,
          tipo: r.tipo,
          inicio: r.inicio,
          quantidade: 0,
        }));
      },
      marcarIntegrado: async (idMovimento: string, agora: Date) => {
        await this.prisma.movimento.update({
          where: { idMovimento },
          data: { dataIntegracao: agora },
        });
      },
    });
  }

  async iniciar(): Promise<void> {
    if (this.timer) return;
    this.log('info', 'GerenciarConcluirOrdensErpWorker iniciado');
    this.timer = setInterval(() => void this.tick(), this.intervaloMs);
    this.timer.unref?.();
  }

  async encerrar(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.cliente.encerrar();
  }

  private async tick(): Promise<void> {
    if (this.rodando) return;
    this.rodando = true;
    try {
      const estabelecimentos = await this.prisma.estabelecimento.findMany({
        where: { manufatura: 'ATIVO' },
        select: { idEstabelecimento: true },
      });
      for (const est of estabelecimentos) {
        const { enviados, erros } = await this.useCase.executar({
          estabelecimentoId: est.idEstabelecimento,
        });
        if (erros.length > 0) {
          this.log('erro', `ERP integração movimentos (${est.idEstabelecimento}): ${erros.length} erro(s)`);
        }
        if (enviados > 0) {
          this.log('info', `ERP integração: ${enviados} movimento(s) enviado(s) (${est.idEstabelecimento})`);
        }
      }
    } catch (err) {
      this.log('erro', `GerenciarConcluirOrdensErpWorker.tick falhou: ${(err as Error).message}`);
    } finally {
      this.rodando = false;
    }
  }
}