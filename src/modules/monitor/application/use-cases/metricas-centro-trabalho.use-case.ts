import type { RepositoryDispositivosComColetores } from './centros-trabalho-com-coletores.use-case.js';

export interface SegmentoLinhaDoTempoResumo {
  inicio: string;
  fim: string;
  status: 'ONLINE' | 'OFFLINE';
}

/**
 * Contadores e linha do tempo por dispositivo — porta injetada do módulo iot
 * (fronteira). Reaproveita a mesma regra de negócio de "peça produzida" e de
 * "linha do tempo online/offline" já usada nos endpoints por-dispositivo
 * (`ConsultarContadoresIotUseCase`/`ConsultarLinhaDoTempoIotUseCase`), sem
 * duplicá-la aqui.
 */
export interface RepositoryContadoresDispositivo {
  consultarTotalContadores(
    dispositivoId: string,
    estabelecimentoId: string,
    de: Date,
    ate: Date,
  ): Promise<number>;
  consultarLinhaDoTempo(
    dispositivoId: string,
    estabelecimentoId: string,
    de: Date,
    ate: Date,
  ): Promise<SegmentoLinhaDoTempoResumo[]>;
}

export interface MetricasCentroTrabalhoDTO {
  centroTrabalhoId: string;
  de: string;
  ate: string;
  pecasProduzidas: number;
  /** Média entre os coletores do centro do % do período em que cada um esteve online. */
  percentualOnlineMedio: number;
}

/**
 * Agrega, para todos os coletores vinculados a um centro de trabalho, o
 * total de peças produzidas (soma dos contadores) e o percentual médio de
 * tempo online no período — para o Dashboard geral do centro.
 */
export class MetricasCentroTrabalhoUseCase {
  constructor(
    private readonly dispositivos: RepositoryDispositivosComColetores,
    private readonly contadores: RepositoryContadoresDispositivo,
  ) {}

  async executar(input: {
    centroTrabalhoId: string;
    estabelecimentoId: string;
    de: Date;
    ate: Date;
  }): Promise<MetricasCentroTrabalhoDTO> {
    const todos = await this.dispositivos.listarDispositivos(input.estabelecimentoId);
    const vinculados = todos.filter((d) => d.centroTrabalhoId === input.centroTrabalhoId);

    if (vinculados.length === 0) {
      return {
        centroTrabalhoId: input.centroTrabalhoId,
        de: input.de.toISOString(),
        ate: input.ate.toISOString(),
        pecasProduzidas: 0,
        percentualOnlineMedio: 0,
      };
    }

    const duracaoTotalMs = Math.max(1, input.ate.getTime() - input.de.getTime());

    const porDispositivo = await Promise.all(
      vinculados.map(async (d) => {
        const [total, segmentos] = await Promise.all([
          this.contadores.consultarTotalContadores(d.id, input.estabelecimentoId, input.de, input.ate),
          this.contadores.consultarLinhaDoTempo(d.id, input.estabelecimentoId, input.de, input.ate),
        ]);
        const duracaoOnlineMs = segmentos
          .filter((s) => s.status === 'ONLINE')
          .reduce((soma, s) => soma + (new Date(s.fim).getTime() - new Date(s.inicio).getTime()), 0);
        return { total, percentualOnline: (duracaoOnlineMs / duracaoTotalMs) * 100 };
      }),
    );

    const pecasProduzidas = porDispositivo.reduce((soma, d) => soma + d.total, 0);
    const percentualOnlineMedio =
      porDispositivo.reduce((soma, d) => soma + d.percentualOnline, 0) / porDispositivo.length;

    return {
      centroTrabalhoId: input.centroTrabalhoId,
      de: input.de.toISOString(),
      ate: input.ate.toISOString(),
      pecasProduzidas,
      percentualOnlineMedio,
    };
  }
}
