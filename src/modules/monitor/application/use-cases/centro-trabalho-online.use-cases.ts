import type { CentroTrabalhoOnline } from '../../domain/entities/centro-trabalho-online.js';
import {
  CentroTrabalhoOnline as CentroTrabalhoOnlineEntity,
  StatusCentroTrabalhoOnline,
} from '../../domain/entities/centro-trabalho-online.js';
import type { CentroTrabalhoOnlineRepository, LeituraChaoDeFabrica } from '../../domain/repositories/centro-trabalho-online.repository.js';
import type { CentroTrabalhoOnlineFactory } from '../../domain/services/centro-trabalho-online.factory.js';
import type { CentroTrabalhoDTO } from '../dtos/monitor.dtos.js';

/** Porta "listar centros ativos" — injetada do módulo manufatura (fronteira). */
export interface RepositoryCentros {
  listarCentrosAtivos(estabelecimentoId: string): Promise<ReadonlyArray<{ idCentroTrabalho: string }>>;
}

/**
 * Monta o snapshot online de todos os centros ativos do estabelecimento
 * (paridade com `ManServiceCalc.MontarCentrosTrabalhoOnline`).
 *
 * Idempotente: chamar a cada 10s resulta em uma linha por centro sempre
 * atualizada com o movimento/ordem/indicador atuais.
 */
export class MontarCentrosTrabalhoOnlineUseCase {
  constructor(
    private readonly repos: CentroTrabalhoOnlineRepository,
    private readonly leitura: LeituraChaoDeFabrica,
    private readonly fabrica: CentroTrabalhoOnlineFactory,
  ) {}

  async executar(input: { estabelecimentoId: string; prisma: RepositoryCentros }): Promise<void> {
    const centros = await input.prisma.listarCentrosAtivos(input.estabelecimentoId);
    const agora = new Date();
    for (const centro of centros) {
      const snapshot = await this.repos.buscarPorCentroTrabalho(centro.idCentroTrabalho);
      const movimentos = await this.leitura.listarMovimentosAbertos(centro.idCentroTrabalho);
      const ordens = await this.leitura.listarOrdensEmCurso(centro.idCentroTrabalho);
      const indicadorId = await this.leitura.buscarIndicadorAtual(centro.idCentroTrabalho);

      const primeiroMovimento = movimentos[0] ?? null;
      const primeiraOrdem = ordens[0]?.ordemProducaoId ?? null;

      const status = this.fabrica.derivar({
        movimento: primeiroMovimento,
        indicador: null,
        agora,
      });

      if (snapshot) {
        snapshot.atualizarStatus({
          status,
          movimentoAbertoId: primeiroMovimento?.movimentoId ?? null,
          ordemProducaoId: primeiraOrdem,
          calculoIndicadoresId: indicadorId,
          agora,
        });
        await this.repos.salvar(snapshot);
      } else {
        const novo = CentroTrabalhoOnlineEntity.criar({
          idCentroTrabalhoOnline: centro.idCentroTrabalho,
          centroTrabalhoId: centro.idCentroTrabalho,
          calculoIndicadoresId: indicadorId,
          movimentoAbertoId: primeiroMovimento?.movimentoId ?? null,
          ordemProducaoId: primeiraOrdem,
        });
        novo.atualizarStatus({
          status,
          movimentoAbertoId: primeiroMovimento?.movimentoId ?? null,
          ordemProducaoId: primeiraOrdem,
          calculoIndicadoresId: indicadorId,
          agora,
        });
        await this.repos.salvar(novo);
      }
    }
  }
}

/**
 * Listagem para o painel online (paridade com `ListarCentrosTrabalhoOnline`).
 * Cada centro ativo vira uma linha com status, movimento aberto, ordem e
 * indicador corrente.
 */
export class ListarCentrosTrabalhoOnlineUseCase {
  constructor(private readonly repos: CentroTrabalhoOnlineRepository) {}

  async executar(criterio: {
    estabelecimentoId: string;
    status?: StatusCentroTrabalhoOnline | undefined;
    grupoMaquinaId?: string | undefined;
  }): Promise<CentroTrabalhoDTO[]> {
    const snapshots = await this.repos.listar(criterio);
    return snapshots.map((s) => ({
      idCentroTrabalhoOnline: s.idCentroTrabalhoOnline,
      centroTrabalhoId: s.centroTrabalhoId,
      status: s.status,
      movimentoAbertoId: s.movimentoAbertoId,
      ordemProducaoId: s.ordemProducaoId,
      calculoIndicadoresId: s.calculoIndicadoresId,
      ultimaAtualizacao: s.ultimaAtualizacao.toISOString(),
    }));
  }
}

/** Marcar snapshots inativos (sem att por X minutos) como DESCONECTADA. */
export class AtualizarOfflineUseCase {
  constructor(private readonly repos: CentroTrabalhoOnlineRepository) {}

  async executar(input: { estabelecimentoId: string; minutosOffline: number; agora?: Date }): Promise<void> {
    const limite = (input.agora ?? new Date()).getTime() - input.minutosOffline * 60 * 1000;
    const snapshots = await this.repos.listar({ estabelecimentoId: input.estabelecimentoId });
    for (const s of snapshots) {
      if (s.ultimaAtualizacao.getTime() < limite && s.status !== StatusCentroTrabalhoOnline.DESCONECTADA) {
        s.atualizarStatus({
          status: StatusCentroTrabalhoOnline.DESCONECTADA,
          movimentoAbertoId: s.movimentoAbertoId,
          ordemProducaoId: s.ordemProducaoId,
          calculoIndicadoresId: s.calculoIndicadoresId,
          agora: input.agora ?? new Date(),
        });
        await this.repos.salvar(s);
      }
    }
    void (null as unknown as CentroTrabalhoOnline);
  }
}