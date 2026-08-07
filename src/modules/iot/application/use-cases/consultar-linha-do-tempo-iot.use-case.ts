import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { LeituraIotRepository } from '../../domain/repositories/leitura-iot.repository.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';

export type StatusSegmentoLinhaDoTempo = 'ONLINE' | 'OFFLINE';

export interface SegmentoLinhaDoTempoDTO {
  inicio: string;
  fim: string;
  status: StatusSegmentoLinhaDoTempo;
}

export interface LinhaDoTempoIotDTO {
  dispositivoId: string;
  de: string;
  ate: string;
  segmentos: SegmentoLinhaDoTempoDTO[];
}

export interface ConsultarLinhaDoTempoIotInput {
  dispositivoId: string;
  estabelecimentoId: string;
  de?: Date | undefined;
  ate?: Date | undefined;
}

const LIMIAR_OFFLINE_MINUTOS = 5;

/**
 * Linha do tempo online/offline aproximada de um coletor, derivada dos
 * timestamps de `LeituraIot` já persistidos: um gap maior que
 * `LIMIAR_OFFLINE_MINUTOS` entre duas leituras consecutivas vira um segmento
 * OFFLINE entre elas.
 *
 * Isto é uma HEURÍSTICA, não o histórico real de conexão do broker — o
 * RabbitMQ não persiste eventos de conexão/desconexão hoje, só o estado
 * instantâneo (ver `ConsultorConexoesBroker`). Um coletor pode estar
 * fisicamente online sem gerar leitura (ex.: todas as portas desabilitadas)
 * e aparecer como OFFLINE aqui — é uma aproximação, documentada para quem for
 * usar este dado saber a limitação.
 */
export class ConsultarLinhaDoTempoIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly leituras: LeituraIotRepository,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async executar(input: ConsultarLinhaDoTempoIotInput): Promise<LinhaDoTempoIotDTO> {
    const dispositivo = await this.dispositivos.buscarPorId(
      input.dispositivoId,
      input.estabelecimentoId,
    );
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(input.dispositivoId);
    }

    const ate = input.ate ?? this.agora();
    const de = input.de ?? new Date(ate.getTime() - 24 * 60 * 60 * 1000);

    const leituras = await this.leituras.listar({
      dispositivoId: dispositivo.idDispositivoIot,
      de,
      ate,
    });

    const ocorrencias = [...new Set(leituras.map((l) => l.ocorridoEm.getTime()))].sort(
      (a, b) => a - b,
    );

    const segmentos: SegmentoLinhaDoTempoDTO[] = [];
    const limiarMs = LIMIAR_OFFLINE_MINUTOS * 60 * 1000;

    if (ocorrencias.length === 0) {
      segmentos.push({ inicio: de.toISOString(), fim: ate.toISOString(), status: 'OFFLINE' });
    } else {
      let inicioSegmento = ocorrencias[0]!;
      let fimSegmento = ocorrencias[0]!;

      if (inicioSegmento - de.getTime() > limiarMs) {
        segmentos.push({
          inicio: de.toISOString(),
          fim: new Date(inicioSegmento).toISOString(),
          status: 'OFFLINE',
        });
      }

      for (let i = 1; i < ocorrencias.length; i++) {
        const atual = ocorrencias[i]!;
        if (atual - fimSegmento > limiarMs) {
          segmentos.push({
            inicio: new Date(inicioSegmento).toISOString(),
            fim: new Date(fimSegmento).toISOString(),
            status: 'ONLINE',
          });
          segmentos.push({
            inicio: new Date(fimSegmento).toISOString(),
            fim: new Date(atual).toISOString(),
            status: 'OFFLINE',
          });
          inicioSegmento = atual;
        }
        fimSegmento = atual;
      }

      segmentos.push({
        inicio: new Date(inicioSegmento).toISOString(),
        fim: new Date(fimSegmento).toISOString(),
        status: 'ONLINE',
      });

      if (ate.getTime() - fimSegmento > limiarMs) {
        segmentos.push({
          inicio: new Date(fimSegmento).toISOString(),
          fim: ate.toISOString(),
          status: 'OFFLINE',
        });
      }
    }

    return {
      dispositivoId: dispositivo.idDispositivoIot,
      de: de.toISOString(),
      ate: ate.toISOString(),
      segmentos,
    };
  }
}
