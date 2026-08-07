/**
 * Por que um movimento de coletor foi descartado pela ingestão. É o mesmo
 * vocabulário do `RegistrarMovimentoIotUseCase` — vive aqui (domínio) para que
 * o use-case e a entidade falem a mesma língua sem o domínio depender da
 * aplicação.
 */
export type MotivoFalhaLeitura =
  | 'DISPOSITIVO_NAO_CADASTRADO'
  | 'ENTRADA_NAO_CONFIGURADA'
  | 'ENTRADA_DESABILITADA'
  | 'PAYLOAD_INVALIDO';

interface FalhaLeituraIotProps {
  idFalhaLeituraIot: string;
  /** Nulo quando o serial não está cadastrado — o `serial` registra a origem. */
  dispositivoId: string | null;
  serial: string;
  input: number;
  motivo: MotivoFalhaLeitura;
  ocorridoEm: Date;
  registradoEm: Date;
  chaveEvento: string;
}

/**
 * Movimento de coletor descartado (o inverso de `LeituraIot`). Imutável:
 * representa um fato ocorrido no chão de fábrica. Alimenta o lado "falhas" da
 * tela de monitoramento — sem depender de log do worker, que some com o
 * processo.
 */
export class FalhaLeituraIot {
  private constructor(private props: FalhaLeituraIotProps) {}

  static criar(input: {
    idFalhaLeituraIot: string;
    dispositivoId: string | null;
    serial: string;
    input: number;
    motivo: MotivoFalhaLeitura;
    ocorridoEm: Date;
  }): FalhaLeituraIot {
    if (!input.serial.trim()) {
      throw new Error('Serial do coletor é obrigatório');
    }
    if (!Number.isInteger(input.input) || input.input < 0) {
      throw new Error('Número da porta (input) deve ser um inteiro não negativo');
    }
    if (Number.isNaN(input.ocorridoEm.getTime())) {
      throw new Error('Instante do movimento (ocorridoEm) inválido');
    }
    return new FalhaLeituraIot({
      idFalhaLeituraIot: input.idFalhaLeituraIot,
      dispositivoId: input.dispositivoId,
      serial: input.serial,
      input: input.input,
      motivo: input.motivo,
      ocorridoEm: input.ocorridoEm,
      registradoEm: new Date(),
      // Deduplicação idêntica à de LeituraIot: mesma porta no mesmo instante.
      chaveEvento: `${input.serial}:${input.input}:${input.ocorridoEm.toISOString()}`,
    });
  }

  static restaurar(props: FalhaLeituraIotProps): FalhaLeituraIot {
    return new FalhaLeituraIot(props);
  }

  get idFalhaLeituraIot(): string {
    return this.props.idFalhaLeituraIot;
  }
  get dispositivoId(): string | null {
    return this.props.dispositivoId;
  }
  get serial(): string {
    return this.props.serial;
  }
  get input(): number {
    return this.props.input;
  }
  get motivo(): MotivoFalhaLeitura {
    return this.props.motivo;
  }
  get ocorridoEm(): Date {
    return this.props.ocorridoEm;
  }
  get registradoEm(): Date {
    return this.props.registradoEm;
  }
  get chaveEvento(): string {
    return this.props.chaveEvento;
  }
}
