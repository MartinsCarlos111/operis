/** ex-EnumStatusAtualizacao. */
export const StatusAtualizacaoFirmware = {
  SOLICITADA: 'SOLICITADA',
  INICIADA: 'INICIADA',
  CONCLUIDA: 'CONCLUIDA',
  FALHOU: 'FALHOU',
} as const;
export type StatusAtualizacaoFirmware =
  (typeof StatusAtualizacaoFirmware)[keyof typeof StatusAtualizacaoFirmware];

interface AtualizacaoFirmwareIotProps {
  idAtualizacaoFirmware: string;
  dispositivoId: string;
  /** Binário solicitado (FirmwareIot) — é dele que vem a URL de download publicada. */
  firmwareId: string;
  versaoTarget: string;
  status: StatusAtualizacaoFirmware;
  solicitadoEm: Date;
  iniciadoEm: Date | null;
  concluidoEm: Date | null;
  mensagemErro: string | null;
}

/**
 * Ciclo de atualização OTA de firmware de um dispositivo IoT (migrado de
 * Octopus `AtualizacaoIOT`). Cada `UPDATE` recebido do dispositivo promove o
 * `status`:
 *   - `UPDATESTARTED`   → INICIADA
 *   - `UPDATECOMPLETED` → CONCLUIDA
 *   - `UPDATEFAILED`    → FALHOU
 *
 * É um agregado rastreável: imutável em cada etapa (uma atualização não volta
 * de CONCLUIDA para SOLICITADA), com transições validadas.
 */
export class AtualizacaoFirmwareIot {
  private constructor(private props: AtualizacaoFirmwareIotProps) {}

  static criar(input: {
    idAtualizacaoFirmware: string;
    dispositivoId: string;
    firmwareId: string;
    versaoTarget: string;
  }): AtualizacaoFirmwareIot {
    if (!input.versaoTarget.trim()) {
      throw new Error('Versão target do firmware não pode ser vazia.');
    }
    return new AtualizacaoFirmwareIot({
      idAtualizacaoFirmware: input.idAtualizacaoFirmware,
      dispositivoId: input.dispositivoId,
      firmwareId: input.firmwareId,
      versaoTarget: input.versaoTarget,
      status: StatusAtualizacaoFirmware.SOLICITADA,
      solicitadoEm: new Date(),
      iniciadoEm: null,
      concluidoEm: null,
      mensagemErro: null,
    });
  }

  static restaurar(props: AtualizacaoFirmwareIotProps): AtualizacaoFirmwareIot {
    return new AtualizacaoFirmwareIot(props);
  }

  /** Transições de status pelo dispatch OTA — paridade com `EnumTipoMsgIOT`. */
  marcarIniciada(agora = new Date()): void {
    if (this.props.status !== StatusAtualizacaoFirmware.SOLICITADA) {
      throw new Error(
        `Atualização ${this.props.idAtualizacaoFirmware} já está ${this.props.status}.`,
      );
    }
    this.props.status = StatusAtualizacaoFirmware.INICIADA;
    this.props.iniciadoEm = agora;
  }

  marcarConcluida(agora = new Date()): void {
    if (this.props.status !== StatusAtualizacaoFirmware.INICIADA) {
      throw new Error(
        `Atualização ${this.props.idAtualizacaoFirmware} precisa estar INICIADA para concluir (atual: ${this.props.status}).`,
      );
    }
    this.props.status = StatusAtualizacaoFirmware.CONCLUIDA;
    this.props.concluidoEm = agora;
    this.props.mensagemErro = null;
  }

  marcarFalha(motivo: string, agora = new Date()): void {
    if (this.props.status === StatusAtualizacaoFirmware.CONCLUIDA) {
      throw new Error(`Atualização ${this.props.idAtualizacaoFirmware} já CONCLUIDA; não pode falhar.`);
    }
    this.props.status = StatusAtualizacaoFirmware.FALHOU;
    this.props.concluidoEm = agora;
    this.props.mensagemErro = motivo;
  }

  get idAtualizacaoFirmware(): string {
    return this.props.idAtualizacaoFirmware;
  }
  get dispositivoId(): string {
    return this.props.dispositivoId;
  }
  get firmwareId(): string {
    return this.props.firmwareId;
  }
  get versaoTarget(): string {
    return this.props.versaoTarget;
  }
  get status(): StatusAtualizacaoFirmware {
    return this.props.status;
  }
  get solicitadoEm(): Date {
    return this.props.solicitadoEm;
  }
  get iniciadoEm(): Date | null {
    return this.props.iniciadoEm;
  }
  get concluidoEm(): Date | null {
    return this.props.concluidoEm;
  }
  get mensagemErro(): string | null {
    return this.props.mensagemErro;
  }
}