import { LeituraIot } from '../../domain/entities/leitura-iot.js';
import { FalhaLeituraIot } from '../../domain/entities/falha-leitura-iot.js';
import { CONTEXTOS_IOT, type ContextoIot } from '../../domain/entities/entrada-iot.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { LeituraIotRepository } from '../../domain/repositories/leitura-iot.repository.js';
import type { FalhaLeituraIotRepository } from '../../domain/repositories/falha-leitura-iot.repository.js';
import type { MovimentoRecebido } from '../../domain/gateways/consumidor-mensagens-iot.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';

export interface ResultadoRegistro {
  registradas: number;
  descartadas: Array<{ serial: string; input: number; motivo: FalhaLeituraIot['motivo'] }>;
}

/**
 * Aplica as regras de negócio sobre os movimentos que chegam do broker e
 * persiste as leituras válidas.
 *
 * As regras (paridade com o fluxo do octopus, onde o serviço só gravava
 * indicador de IOT conhecido):
 *  - o dispositivo precisa estar cadastrado (resolvido pelo serial);
 *  - a porta precisa ter EntradaIot configurada — sem configuração não há
 *    como saber o que o sinal significa;
 *  - a entrada precisa estar habilitada;
 *  - o contexto vem da configuração, não do payload: quem decide o significado
 *    do sinal é o cadastro, não o dispositivo.
 *
 * Movimentos inválidos são descartados com motivo e persistidos como
 * `FalhaLeituraIot` — o coletor mal configurado não trava a ingestão dos
 * demais (o lote nunca derruba), mas o operador enxerga o problema na tela de
 * monitoramento em vez de depender de log do worker.
 */
export class RegistrarMovimentoIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly leituras: LeituraIotRepository,
    private readonly falhas: FalhaLeituraIotRepository,
    private readonly ids: GeradorId,
  ) {}

  async executar(movimentos: MovimentoRecebido[]): Promise<ResultadoRegistro> {
    const descartadas: ResultadoRegistro['descartadas'] = [];
    const aGravar: LeituraIot[] = [];
    const aRegistrarFalha: FalhaLeituraIot[] = [];

    // Um lote costuma vir do mesmo dispositivo: resolve cada serial uma vez.
    const cache = new Map<string, Awaited<ReturnType<DispositivoIotRepository['buscarPorSerial']>>>();

    for (const mov of movimentos) {
      if (!cache.has(mov.serial)) {
        cache.set(mov.serial, await this.dispositivos.buscarPorSerial(mov.serial));
      }
      const dispositivo = cache.get(mov.serial) ?? null;

      if (!dispositivo) {
        descartadas.push({ serial: mov.serial, input: mov.input, motivo: 'DISPOSITIVO_NAO_CADASTRADO' });
        aRegistrarFalha.push(
          this.falha(mov, null, 'DISPOSITIVO_NAO_CADASTRADO'),
        );
        continue;
      }

      const entrada = dispositivo.entradas.find((e) => e.input === mov.input);
      if (!entrada) {
        descartadas.push({ serial: mov.serial, input: mov.input, motivo: 'ENTRADA_NAO_CONFIGURADA' });
        aRegistrarFalha.push(
          this.falha(mov, dispositivo.idDispositivoIot, 'ENTRADA_NAO_CONFIGURADA'),
        );
        continue;
      }
      if (!entrada.habilitado) {
        descartadas.push({ serial: mov.serial, input: mov.input, motivo: 'ENTRADA_DESABILITADA' });
        aRegistrarFalha.push(
          this.falha(mov, dispositivo.idDispositivoIot, 'ENTRADA_DESABILITADA'),
        );
        continue;
      }

      try {
        aGravar.push(
          LeituraIot.criar({
            idLeituraIot: this.ids.gerar(),
            dispositivoId: dispositivo.idDispositivoIot,
            input: mov.input,
            // O contexto vem do cadastro — o payload do firmware é só um índice.
            contexto: entrada.contexto,
            valor: mov.valor,
            ocorridoEm: mov.ocorridoEm,
          }),
        );
      } catch {
        descartadas.push({ serial: mov.serial, input: mov.input, motivo: 'PAYLOAD_INVALIDO' });
        aRegistrarFalha.push(
          this.falha(mov, dispositivo.idDispositivoIot, 'PAYLOAD_INVALIDO'),
        );
      }
    }

    const registradas = aGravar.length > 0 ? await this.leituras.salvarLote(aGravar) : 0;
    if (aRegistrarFalha.length > 0) {
      await this.falhas.salvarLote(aRegistrarFalha);
    }
    return { registradas, descartadas };
  }

  private falha(
    mov: MovimentoRecebido,
    dispositivoId: string | null,
    motivo: FalhaLeituraIot['motivo'],
  ): FalhaLeituraIot {
    return FalhaLeituraIot.criar({
      idFalhaLeituraIot: this.ids.gerar(),
      dispositivoId,
      serial: mov.serial,
      input: mov.input,
      motivo,
      ocorridoEm: mov.ocorridoEm,
    });
  }
}

/** Traduz o índice de contexto do firmware para o vocabulário do domínio. */
export function contextoDoIndice(indice: number): ContextoIot | null {
  return CONTEXTOS_IOT[indice] ?? null;
}
