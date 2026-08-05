import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { LeituraIotRepository } from '../../domain/repositories/leitura-iot.repository.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';
import type { ContextoIot, FuncaoIot } from '../../domain/entities/entrada-iot.js';

export interface ContadorEntradaDTO {
  input: number;
  /** Rótulo configurado (ex.: "Ciclo concluído") — o que o operador lê. */
  label: string;
  contexto: ContextoIot;
  funcao: FuncaoIot;
  total: number;
  ocorrencias: number;
  ultimaLeituraEm: string | null;
}

export interface ContadoresDispositivoDTO {
  dispositivoId: string;
  serial: string;
  nome: string;
  de: string;
  ate: string;
  entradas: ContadorEntradaDTO[];
}

export interface ConsultarContadoresInput {
  dispositivoId: string;
  estabelecimentoId: string;
  de?: Date | undefined;
  ate?: Date | undefined;
}

/**
 * Contadores de um coletor num período — é o "contador de peças" da tela.
 *
 * Parte das ENTRADAS CONFIGURADAS, não das leituras: uma porta habilitada sem
 * nenhum pulso deve aparecer zerada, e não sumir da tela. Sem isso o operador
 * não distingue "não produziu" de "sensor não configurado".
 *
 * Sem período informado, usa o turno corrente (últimas 24h).
 */
export class ConsultarContadoresIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly leituras: LeituraIotRepository,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async executar(input: ConsultarContadoresInput): Promise<ContadoresDispositivoDTO> {
    const dispositivo = await this.dispositivos.buscarPorId(
      input.dispositivoId,
      input.estabelecimentoId,
    );
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(input.dispositivoId);
    }

    const ate = input.ate ?? this.agora();
    const de = input.de ?? new Date(ate.getTime() - 24 * 60 * 60 * 1000);

    const contagens = await this.leituras.contarPorEntrada({
      dispositivoId: dispositivo.idDispositivoIot,
      de,
      ate,
    });
    const porInput = new Map(contagens.map((c) => [c.input, c]));

    return {
      dispositivoId: dispositivo.idDispositivoIot,
      serial: dispositivo.serial,
      nome: dispositivo.nome,
      de: de.toISOString(),
      ate: ate.toISOString(),
      entradas: dispositivo.entradas
        .filter((e) => e.habilitado)
        .map((e) => {
          const c = porInput.get(e.input);
          return {
            input: e.input,
            label: e.label,
            contexto: e.contexto,
            funcao: e.funcao,
            total: c?.total ?? 0,
            ocorrencias: c?.ocorrencias ?? 0,
            ultimaLeituraEm: c?.ultimaLeituraEm ? c.ultimaLeituraEm.toISOString() : null,
          };
        }),
    };
  }
}
