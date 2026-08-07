import type { FirmwareIot } from '../entities/firmware-iot.js';

export interface FirmwareRepository {
  buscarPorId(id: string, estabelecimentoId: string): Promise<FirmwareIot | null>;
  /**
   * Sem escopo de estabelecimento: usado pela rota pública de download, que
   * não tem contexto autenticado (o coletor físico não envia credenciais) —
   * o `idFirmwareIot` (UUID) já é a identidade suficiente nesse caso.
   */
  buscarPorIdSemEscopo(id: string): Promise<FirmwareIot | null>;
  buscarPorVersao(
    modelo: number,
    versao: string,
    estabelecimentoId: string,
  ): Promise<FirmwareIot | null>;
  /** Histórico de versões de um modelo, mais recente primeiro. */
  listarPorModelo(modelo: number, estabelecimentoId: string): Promise<FirmwareIot[]>;
  salvar(firmware: FirmwareIot): Promise<void>;
}
