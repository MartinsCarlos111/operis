import type { AtualizacaoFirmwareIot } from '../../domain/entities/atualizacao-firmware-iot.js';
import type { AtualizacaoFirmwareRepository } from '../../domain/repositories/atualizacao-firmware.repository.js';
import type { MensagemIot } from '../../domain/gateways/consumidor-mensagens-iot.js';

/**
 * Despacha as mensagens OTA do firmware (paridade com `MaquinaConsumer` para os
 * tipos `UPDATE`/`UPDATESTARTED`/`UPDATECOMPLETED`/`UPDATEFAILED`).
 *
 * Liga o ciclo `AtualizacaoFirmwareIot`:
 *   - UPDATE          : não faça nada alem de logar (solicitar OTA é feito pela UI admin).
 *   - UPDATESTARTED   : marcarIniciada()
 *   - UPDATECOMPLETED : marcarConcluida()
 *   - UPDATEFAILED    : marcarFalha(motivo)
 *
 * A primeira mensagem UPDATE de um dispositivo sem atualização em curso é
 * descartada — não há ciclo para atualizar.
 */
export class DespacharAtualizacaoFirmwareUseCase {
  constructor(
    private readonly atualizacoes: AtualizacaoFirmwareRepository,
    /** Resolve dispositivoId por serial — injeta o mesmo repo do módulo iot. */
    private readonly resolverDispositivo: (serial: string) => Promise<string | null>,
    private readonly log: (msg: string, extra?: unknown) => void = () => {},
  ) {}

  async executar(mensagem: MensagemIot): Promise<void> {
    if (
      mensagem.tipo !== 'UPDATE' &&
      mensagem.tipo !== 'UPDATESTARTED' &&
      mensagem.tipo !== 'UPDATECOMPLETED' &&
      mensagem.tipo !== 'UPDATEFAILED'
    ) {
      return;
    }

    const dispositivoId = await this.resolverDispositivo(mensagem.serial);
    if (!dispositivoId) {
      this.log(`OTA ${mensagem.tipo} de serial desconhecido: ${mensagem.serial}`);
      return;
    }

    const ciclo = await this.atualizacoes.buscarEmCourse(dispositivoId);
    if (!ciclo) {
      this.log(`OTA ${mensagem.tipo} sem ciclo em curso para ${mensagem.serial}`);
      return;
    }

    try {
      switch (mensagem.tipo) {
        case 'UPDATESTARTED':
          ciclo.marcarIniciada();
          break;
        case 'UPDATECOMPLETED':
          ciclo.marcarConcluida();
          break;
        case 'UPDATEFAILED':
          ciclo.marcarFalha(this.extrairMotivo(mensagem.dados));
          break;
        case 'UPDATE':
          // só reconciliação informativa: nada a fazer aqui.
          return;
      }
    } catch (err) {
      this.log(`Falha ao processar OTA ${mensagem.tipo}: ${(err as Error).message}`);
      return;
    }

    await this.atualizacoes.salvar(ciclo);
  }

  private extrairMotivo(dados: unknown): string {
    if (dados && typeof dados === 'object' && 'motivo' in dados) {
      const v = (dados as Record<string, unknown>)['motivo'];
      if (typeof v === 'string') return v;
    }
    return 'Erro não especificado pelo dispositivo.';
  }
}