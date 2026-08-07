import type { PrismaClient } from '@prisma/client';
import {
  MontarCentrosTrabalhoOnlineUseCase,
  type RepositoryCentros,
} from '../application/use-cases/centro-trabalho-online.use-cases.js';
import { AtualizarOfflineUseCase } from '../application/use-cases/centro-trabalho-online.use-cases.js';
import { CentroTrabalhoOnlineFactory } from '../domain/services/centro-trabalho-online.factory.js';
import { PrismaCentroTrabalhoOnlineRepository } from '../infrastructure/persistence/prisma-centro-trabalho-online.repository.js';
import { PrismaLeituraChaoDeFabrica } from '../infrastructure/persistence/prisma-leitura-chao-de-fabrica.js';

export type LogWorker = (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void;

export interface OpcoesMonitorWorker {
  prisma: PrismaClient;
  intervaloMs?: number;
  onlineDoCentro: (centroTrabalhoId: string) => Promise<boolean>;
  log?: LogWorker;
}

/**
 * Worker periódico que monta o snapshot de `CentroTrabalhoOnline` (paridade
 * com thread `MontarCentrosTrabalhoOnline`). Tick a cada 10s.
 */
export class MonitorWorker {
  private readonly intervaloMs: number;
  private readonly montar: MontarCentrosTrabalhoOnlineUseCase;
  private readonly offline: AtualizarOfflineUseCase;
  private readonly prisma: PrismaClient;
  private readonly log: LogWorker;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rodando = false;

  constructor(opcoes: OpcoesMonitorWorker) {
    this.prisma = opcoes.prisma;
    this.intervaloMs = opcoes.intervaloMs ?? 10_000;
    this.log = opcoes.log ?? (() => {});
    const repos = new PrismaCentroTrabalhoOnlineRepository(opcoes.prisma);
    const leitura = new PrismaLeituraChaoDeFabrica(opcoes.prisma);
    const fabrica = new CentroTrabalhoOnlineFactory(opcoes.onlineDoCentro);
    this.montar = new MontarCentrosTrabalhoOnlineUseCase(repos, leitura, fabrica);
    this.offline = new AtualizarOfflineUseCase(repos);
  }

  async iniciar(): Promise<void> {
    if (this.timer) return;
    this.log('info', 'MonitorWorker iniciado');
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervaloMs);
    this.timer.unref?.();
  }

  async encerrar(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.rodando) return;
    this.rodando = true;
    try {
      const prismaAdapter: RepositoryCentros = {
        listarCentrosAtivos: async (estabelecimentoId: string) => {
          const rows = await this.prisma.centroTrabalho.findMany({
            where: { estabelecimentoId, status: 'ATIVO' },
            select: { idCentroTrabalho: true },
          });
          return rows;
        },
      };
      const estabelecimentos = await this.prisma.estabelecimento.findMany({
        where: { manufatura: 'ATIVO' },
        select: { idEstabelecimento: true },
      });
      for (const est of estabelecimentos) {
        await this.montar.executar({
          estabelecimentoId: est.idEstabelecimento,
          prisma: prismaAdapter,
        });
        await this.offline.executar({
          estabelecimentoId: est.idEstabelecimento,
          minutosOffline: 5,
        });
      }
    } catch (err) {
      this.log('erro', `MonitorWorker.tick falhou: ${(err as Error).message}`);
    } finally {
      this.rodando = false;
    }
  }
}