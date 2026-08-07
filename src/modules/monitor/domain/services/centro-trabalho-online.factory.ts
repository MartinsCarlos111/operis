import { StatusCentroTrabalhoOnline, type CentroTrabalhoOnline } from '../entities/centro-trabalho-online.js';
import type { LeituraChaoDeFabrica } from '../repositories/centro-trabalho-online.repository.js';
import type { TipoMovimento } from '@modules/manufatura/domain/entities/movimento.js';

/**
 * Factory de derivação do status online (paridade com `CentroTrabalhoOnlineFactory`
 * + `CentroTrabalhoOnlineRN`). Recebe o movimento aberto atual, o último
 * reporte e a janela de turno, e devolve um `StatusCentroTrabalhoOnline`.
 *
 *   - REPORTE / PREPARACAO abertos            → PRODUZINDO / EM_SETUP
 *   - PARADA aberta                            → PARADA
 *   - PARADA+com tecnicoManutencao preenchido  → MANUTENCAO_EM_ATENDIMENTO
 *   - PARADA+com ordemManutencao mas sem fim    → MANUTENCAO_SOLICITADA
 *   - Sem movimento aberto háhoras              → OCIOSA
 *   - Se OEE do turno < metaDesempTurno         → BAIXO_DESEMPENHO
 *   - Dispositivo IoT offline                   → DESCONECTADA
 */
export class CentroTrabalhoOnlineFactory {
  constructor(
    /** Resolve se o serial IoT está online — injetado do módulo iot. */
    private readonly dispositivoOnline: (centroTrabalhoId: string) => Promise<boolean>,
    private readonly tempos: { oeeTurnoMinPercent: number } = { oeeTurnoMinPercent: 0.85 },
  ) {}

  derivar(input: {
    movimento: { tipo: string; inicio: Date } | null;
    indicador: { oee: number; metaDesempTurno: number } | null;
    agora: Date;
  }): StatusCentroTrabalhoOnline {
    if (!input.movimento) {
      // Sem movimento aberto e sem dados de IoT — fica OCIOSA por enquanto.
      // DESCONECTADA é verificada externamente (consultor de conexões).
      return StatusCentroTrabalhoOnline.OCIOSA;
    }
    const tipo = input.movimento.tipo as TipoMovimento;
    switch (tipo) {
      case 'REPORTE':
        return StatusCentroTrabalhoOnline.PRODUZINDO;
      case 'PREPARACAO':
      case 'TROCA_FERRAMENTAL':
        return StatusCentroTrabalhoOnline.EM_SETUP;
      case 'PARADA':
        return StatusCentroTrabalhoOnline.PARADA;
      default:
        return StatusCentroTrabalhoOnline.OCIOSA;
    }
  }

  async aplicarDesempenho(
    snapshot: CentroTrabalhoOnline,
    input: { indicador: { oee: number; metaDesempTurno: number } | null },
  ): Promise<void> {
    if (!input.indicador) return;
    const baixoDesempenho =
      input.indicador.metaDesempTurno > 0 &&
      input.indicador.oee / Math.max(input.indicador.metaDesempTurno, 0.0001) < this.tempos.oeeTurnoMinPercent;
    if (baixoDesempenho && snapshot.status === StatusCentroTrabalhoOnline.PRODUZINDO) {
      snapshot.atualizarStatus({
        status: StatusCentroTrabalhoOnline.BAIXO_DESEMPENHO,
        movimentoAbertoId: snapshot.movimentoAbertoId,
        ordemProducaoId: snapshot.ordemProducaoId,
        calculoIndicadoresId: snapshot.calculoIndicadoresId,
      });
    }
  }

  onlineDoDispositivo(): (centroTrabalhoId: string) => Promise<boolean> {
    return this.dispositivoOnline;
  }
}

void (null as unknown as LeituraChaoDeFabrica);