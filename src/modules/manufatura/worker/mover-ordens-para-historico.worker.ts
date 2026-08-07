import type { PrismaClient } from '@prisma/client';

export type LogWorker = (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void;

export interface OpcoesMoverOrdensParaHistoricoWorker {
  prisma: PrismaClient;
  /** Idade mínima (em dias) para mover ordens/movimentos. Default 90 dias. */
  diasHistorico?: number;
  /** Tamanho do lote por tick (paridade com o lote do legado). */
  tamanhoLote?: number;
  /** Intervalo entre ticks — diário por padrão. */
  intervaloMs?: number;
  log?: LogWorker;
}

/**
 * Job diário que migra ordens e movimentos antigos para as tabelas paralelas
 * `*_historico` (migrado da thread `MoverOrdensParaHistorico` do legado).
 *
 *   1. Busca ordens com `atualizadoEm < (agora - diasHistorico)` e status
 *      terminal (CONCLUIDA/BAIXADA/CANCELADA).
 *   2. Move Movimento→MovimentoHistorico, Reserva→ReservaHistorico,
 *      Etiqueta→EtiquetaHistorico, Rastreabilidade→RastreabilidadeHistorico,
 *      OrdemProducao→OrdemProducaoHistorico em PK composta por transação:
 *      falha num registro aborta só aquele; próximos tentam no próximo tick.
 */
export class MoverOrdensParaHistoricoWorker {
  private readonly intervaloMs: number;
  private readonly diasHistorico: number;
  private readonly tamanhoLote: number;
  private readonly prisma: PrismaClient;
  private readonly log: LogWorker;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rodando = false;

  constructor(opcoes: OpcoesMoverOrdensParaHistoricoWorker) {
    this.prisma = opcoes.prisma;
    this.intervaloMs = opcoes.intervaloMs ?? 24 * 60 * 60 * 1000; // 24h
    this.diasHistorico = opcoes.diasHistorico ?? 90;
    this.tamanhoLote = opcoes.tamanhoLote ?? 100;
    this.log = opcoes.log ?? (() => {});
  }

  async iniciar(): Promise<void> {
    if (this.timer) return;
    this.log('info', `MoverOrdensParaHistoricoWorker iniciado (diasHistorico=${this.diasHistorico})`);
    // Não roda no boot — Historical migration is scheduled daily, aguarda o próximo tick.
    this.timer = setInterval(() => void this.tick(), this.intervaloMs);
    this.timer.unref?.();
  }

  async encerrar(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tickManual(): Promise<{ movidos: number }> {
    return this.tick();
  }

  private async tick(): Promise<{ movidos: number }> {
    if (this.rodando) return { movidos: 0 };
    this.rodando = true;
    let movidos = 0;
    try {
      const corte = new Date(Date.now() - this.diasHistorico * 24 * 60 * 60 * 1000);
      const ordens = await this.prisma.ordemProducao.findMany({
        where: {
          atualizadoEm: { lt: corte },
          status: { in: ['CONCLUIDA', 'BAIXADA', 'CANCELADA'] },
        },
        take: this.tamanhoLote,
      });

      for (const ordem of ordens) {
        try {
          await this.moverOrdem(ordem.idOrdemProducao);
          movidos++;
        } catch (err) {
          this.log('erro', `falha ao mover ordem ${ordem.idOrdemProducao} para histórico: ${(err as Error).message}`);
        }
      }
      if (movidos > 0) this.log('info', `MoverOrdensParaHistorico: ${movidos} ordem(ns) migrada(s).`);
    } catch (err) {
      this.log('erro', `MoverOrdensParaHistoricoWorker.tick falhou: ${(err as Error).message}`);
    } finally {
      this.rodando = false;
    }
    return { movidos };
  }

  private async moverOrdem(idOrdemProducao: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Movimentos → MovimentoHistorico
      const movimentos = await tx.movimento.findMany({ where: { ordemProducaoId: idOrdemProducao } });
      if (movimentos.length > 0) {
        await tx.movimentoHistorico.createMany({
          data: movimentos.map((m) => ({
            idMovimentoOriginal: m.idMovimento,
            tipo: m.tipo,
            centroTrabalhoId: m.centroTrabalhoId,
            ordemProducaoId: m.ordemProducaoId,
            reservaId: m.reservaId,
            usuarioId: m.usuarioId,
            operador: m.operador,
            turnoId: m.turnoId,
            dataTurno: m.dataTurno,
            inicio: m.inicio,
            fim: m.fim,
            duracaoSegundos: m.duracaoSegundos,
            consideraOee: m.consideraOee,
            quantidadeUnidade: m.quantidadeUnidade,
            quantidadeMetragem: m.quantidadeMetragem,
            quantidadePeso: m.quantidadePeso,
            quantidadeArea: m.quantidadeArea,
            quantidadeVolume: m.quantidadeVolume,
            quantidadeEspecifica: m.quantidadeEspecifica,
            tipoParadaId: m.tipoParadaId,
            tipoRefugoId: m.tipoRefugoId,
            tipoCausaId: m.tipoCausaId,
            tipoRecusaId: m.tipoRecusaId,
            tecnicoManutencao: m.tecnicoManutencao,
            ordemManutencao: m.ordemManutencao,
            fimSolicitacao: m.fimSolicitacao,
            tempoSolicitacaoSegundos: m.tempoSolicitacaoSegundos,
            fimManutencao: m.fimManutencao,
            tempoManutencaoSegundos: m.tempoManutencaoSegundos,
            descricaoCausa: m.descricaoCausa,
            reportaErp: m.reportaErp,
            dataIntegracao: m.dataIntegracao,
            cancelado: m.cancelado,
            usuarioCancelamentoId: m.usuarioCancelamentoId,
            observacao: m.observacao,
          })),
        });
        await tx.movimentoCalculoIndicadores.deleteMany({
          where: { movimentoId: { in: movimentos.map((m) => m.idMovimento) } },
        });
        await tx.movimento.deleteMany({ where: { ordemProducaoId: idOrdemProducao } });
      }

      // 2. Reservas → ReservaHistorico
      const ordem = await tx.ordemProducao.findUnique({ where: { idOrdemProducao: idOrdemProducao } });
      if (!ordem) return;
      const historicoOrdem = await tx.ordemProducaoHistorico.create({
        data: {
          idOrdemProducaoOriginal: ordem.idOrdemProducao,
          codigo: ordem.codigo,
          identificador: ordem.identificador,
          itemCodigo: ordem.itemCodigo,
          itemDescricao: ordem.itemDescricao,
          quantidadePlanejada: ordem.quantidadePlanejada,
          quantidadeProduzida: ordem.quantidadeProduzida,
          quantidadeRefugo: ordem.quantidadeRefugo,
          unidadeMedida: ordem.unidadeMedida,
          status: ordem.status,
          origem: ordem.origem,
          modoDistribuicao: ordem.modoDistribuicao,
          prioridade: ordem.prioridade,
          prioridadeCodigoRedutor: ordem.prioridadeCodigoRedutor,
          sequencia: ordem.sequencia,
          centroTrabalhoValido: ordem.centroTrabalhoValido,
          cliente: ordem.cliente,
          pedido: ordem.pedido,
          observacoes: ordem.observacoes,
          criadaEm: ordem.criadaEm,
          liberacaoEm: ordem.liberacaoEm,
          inicioPlanejado: ordem.inicioPlanejado,
          fimPlanejado: ordem.fimPlanejado,
          encerraEm: ordem.encerraEm,
          estabelecimentoId: ordem.estabelecimentoId,
        },
      });

      const reservas = await tx.reserva.findMany({ where: { ordemProducaoId: idOrdemProducao } });
      if (reservas.length > 0) {
        await tx.reservaHistorico.createMany({
          data: reservas.map((r) => ({
            idReservaOriginal: r.idReserva,
            ordemProducaoHistoricoId: historicoOrdem.idOrdemProducaoHistorico,
            sequencia: r.sequencia,
            itemCodigo: r.itemCodigo,
            itemDescricao: r.itemDescricao,
            lote: r.lote,
            unidadeMedida: r.unidadeMedida,
            quantidadeReserva: r.quantidadeReserva,
            quantidadeRequisitada: r.quantidadeRequisitada,
            quantidadeDevolvida: r.quantidadeDevolvida,
            requisicaoTerminal: r.requisicaoTerminal,
            status: r.status,
          })),
        });
        await tx.reserva.deleteMany({ where: { ordemProducaoId: idOrdemProducao } });
      }

      // 3. Etiquetas → EtiquetaHistorico
      const etiquetas = await tx.etiqueta.findMany({ where: { ordemProducaoId: idOrdemProducao } });
      if (etiquetas.length > 0) {
        await tx.etiquetaHistorico.createMany({
          data: etiquetas.map((e) => ({
            idEtiquetaOriginal: e.idEtiqueta,
            ordemProducaoHistoricoId: historicoOrdem.idOrdemProducaoHistorico,
            codigoBarras: e.codigoBarras,
            sequencial: e.sequencial,
            motivoGeracao: e.motivoGeracao,
            status: e.status,
            quantidade: e.quantidade,
            unidadeMedida: e.unidadeMedida,
            impressoEm: e.impressoEm,
            baixadoEm: e.baixadoEm,
            usuarioId: e.usuarioId,
            observacao: e.observacao,
          })),
        });
        // 4. Rastreabilidades → RastreabilidadeHistorico
        for (const e of etiquetas) {
          const rastreabilidades = await tx.rastreabilidade.findMany({ where: { etiquetaId: e.idEtiqueta } });
          if (rastreabilidades.length > 0) {
            // Encontra o histórico correspondente — recuperado por `codigoBarras`.
            const historicoEtiqueta = await tx.etiquetaHistorico.findUnique({
              where: { codigoBarras: e.codigoBarras },
            });
            if (historicoEtiqueta) {
              await tx.rastreabilidadeHistorico.createMany({
                data: rastreabilidades.map((r) => ({
                  idRastreabilidadeOriginal: r.idRastreabilidade,
                  etiquetaHistoricoId: historicoEtiqueta.idEtiquetaHistorico,
                  ordemProducaoHistoricoId: historicoOrdem.idOrdemProducaoHistorico,
                  itemCodigo: r.itemCodigo,
                  itemDescricao: r.itemDescricao,
                  lote: r.lote,
                  serie: r.serie,
                  quantidadeProduzida: r.quantidadeProduzida,
                  quantidadeRefugo: r.quantidadeRefugo,
                })),
              });
            }
            await tx.rastreabilidade.deleteMany({ where: { etiquetaId: e.idEtiqueta } });
          }
        }
        await tx.etiqueta.deleteMany({ where: { ordemProducaoId: idOrdemProducao } });
      }

      // 5. Finalmente, exclui a ordem viva.
      await tx.ordemProducao.delete({ where: { idOrdemProducao: idOrdemProducao } });
    });
  }
}