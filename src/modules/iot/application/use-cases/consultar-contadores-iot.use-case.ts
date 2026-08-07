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
  /**
   * Soma de valores no período — só tem sentido para PULSO/PULSO_INICIO/
   * PULSO_FIM (incremento resetado a cada report). Para ACIONADO, o firmware
   * reenvia o mesmo estado a cada report mesmo sem mudança; usar `valorAtual`
   * e `transicoes` em vez de `total`.
   */
  total: number;
  /** Valor da leitura mais recente (0/1) — só preenchido para ACIONADO. */
  valorAtual: number | null;
  /** Mudanças de estado no período — só preenchido para ACIONADO. */
  transicoes: number | null;
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

    const habilitadas = dispositivo.entradas.filter((e) => e.habilitado);

    // ACIONADO não soma (reenvio periódico do mesmo estado) — calcula
    // separado, uma consulta por porta; as demais Funções usam o SUM em lote.
    const acionadas = habilitadas.filter((e) => e.funcao === 'ACIONADO');
    const demais = habilitadas.filter((e) => e.funcao !== 'ACIONADO');

    const [contagens, estados] = await Promise.all([
      demais.length > 0
        ? this.leituras.contarPorEntrada({ dispositivoId: dispositivo.idDispositivoIot, de, ate })
        : Promise.resolve([]),
      Promise.all(
        acionadas.map((e) =>
          this.leituras.estadoDaEntrada({
            dispositivoId: dispositivo.idDispositivoIot,
            de,
            ate,
            input: e.input,
          }),
        ),
      ),
    ]);
    const contagemPorInput = new Map(contagens.map((c) => [c.input, c]));
    const estadoPorInput = new Map(estados.map((e) => [e.input, e]));

    return {
      dispositivoId: dispositivo.idDispositivoIot,
      serial: dispositivo.serial,
      nome: dispositivo.nome,
      de: de.toISOString(),
      ate: ate.toISOString(),
      entradas: habilitadas.map((e) => {
        if (e.funcao === 'ACIONADO') {
          const s = estadoPorInput.get(e.input);
          return {
            input: e.input,
            label: e.label,
            contexto: e.contexto,
            funcao: e.funcao,
            total: 0,
            valorAtual: s?.valorAtual ?? null,
            transicoes: s?.transicoes ?? 0,
            ocorrencias: s?.ocorrencias ?? 0,
            ultimaLeituraEm: s?.ultimaLeituraEm ? s.ultimaLeituraEm.toISOString() : null,
          };
        }
        const c = contagemPorInput.get(e.input);
        return {
          input: e.input,
          label: e.label,
          contexto: e.contexto,
          funcao: e.funcao,
          total: c?.total ?? 0,
          valorAtual: null,
          transicoes: null,
          ocorrencias: c?.ocorrencias ?? 0,
          ultimaLeituraEm: c?.ultimaLeituraEm ? c.ultimaLeituraEm.toISOString() : null,
        };
      }),
    };
  }
}
