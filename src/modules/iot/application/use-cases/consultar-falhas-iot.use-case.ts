import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { FalhaLeituraIotRepository } from '../../domain/repositories/falha-leitura-iot.repository.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';
import type { MotivoFalhaLeitura } from '../../domain/entities/falha-leitura-iot.js';

export interface FalhaLeituraDTO {
  id: string;
  input: number;
  motivo: MotivoFalhaLeitura;
  ocorridoEm: string;
  registradoEm: string;
}

export interface FalhasDispositivoDTO {
  dispositivoId: string;
  serial: string;
  nome: string;
  de: string;
  ate: string;
  total: number;
  falhas: FalhaLeituraDTO[];
}

export interface ConsultarFalhasInput {
  dispositivoId: string;
  estabelecimentoId: string;
  de?: Date | undefined;
  ate?: Date | undefined;
}

/**
 * Falhas de leitura de um coletor num período — o lado "falhas" da tela de
 * monitoramento.
 *
 * Filtra pelo SERIAL do dispositivo (não só pelo id): falhas registradas antes
 * do coletor ser cadastrado têm `dispositivoId` nulo, mas precisam aparecer
 * assim que o aparelho entra no cadastro.
 *
 * Sem período informado, usa o turno corrente (últimas 24h), como os contadores.
 */
export class ConsultarFalhasIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly falhas: FalhaLeituraIotRepository,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async executar(input: ConsultarFalhasInput): Promise<FalhasDispositivoDTO> {
    const dispositivo = await this.dispositivos.buscarPorId(
      input.dispositivoId,
      input.estabelecimentoId,
    );
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(input.dispositivoId);
    }

    const ate = input.ate ?? this.agora();
    const de = input.de ?? new Date(ate.getTime() - 24 * 60 * 60 * 1000);
    const criterio = { serial: dispositivo.serial, de, ate };

    const [falhas, total] = await Promise.all([
      this.falhas.listar(criterio),
      this.falhas.contar(criterio),
    ]);

    return {
      dispositivoId: dispositivo.idDispositivoIot,
      serial: dispositivo.serial,
      nome: dispositivo.nome,
      de: de.toISOString(),
      ate: ate.toISOString(),
      total,
      falhas: falhas.map((f) => ({
        id: f.idFalhaLeituraIot,
        input: f.input,
        motivo: f.motivo,
        ocorridoEm: f.ocorridoEm.toISOString(),
        registradoEm: f.registradoEm.toISOString(),
      })),
    };
  }
}
