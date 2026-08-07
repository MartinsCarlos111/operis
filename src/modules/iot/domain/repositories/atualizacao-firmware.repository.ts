import type { AtualizacaoFirmwareIot } from '../entities/atualizacao-firmware-iot.js';

/**
 * Porta do agregado `AtualizacaoFirmwareIot`. Mantém o ciclo OTA — cada
 * transição (SOLICITADA→INICIADA→CONCLUIDA|FALHOU) é persistida aqui.
 */
export interface AtualizacaoFirmwareRepository {
  buscarPorId(id: string): Promise<AtualizacaoFirmwareIot | null>;
  /** A atualização em curso (status SOLICITADA ou INICIADA) do dispositivo. */
  buscarEmCourse(dispositivoId: string): Promise<AtualizacaoFirmwareIot | null>;
  /** Histórico de ciclos OTA do dispositivo, mais recente primeiro. */
  listarPorDispositivo(dispositivoId: string): Promise<AtualizacaoFirmwareIot[]>;
  salvar(atualizacao: AtualizacaoFirmwareIot): Promise<void>;
}