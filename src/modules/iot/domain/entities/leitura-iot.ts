import type { ContextoIot } from './entrada-iot.js';

interface LeituraIotProps {
  idLeituraIot: string;
  dispositivoId: string;
  input: number;
  contexto: ContextoIot;
  valor: number;
  ocorridoEm: Date;
  chaveEvento: string;
}

/**
 * Leitura enviada por um coletor (migrada de Octopus `MovimentIOT` +
 * `IndicadoresIOT`). Imutável: representa um fato ocorrido no chão de fábrica,
 * não um registro editável — por isso não há métodos de alteração.
 *
 * A `chaveEvento` deduplica reentregas: MQTT garante entrega "ao menos uma
 * vez", então a mesma leitura chega repetida numa reconexão do dispositivo.
 */
export class LeituraIot {
  private constructor(private props: LeituraIotProps) {}

  static criar(input: {
    idLeituraIot: string;
    dispositivoId: string;
    input: number;
    contexto: ContextoIot;
    valor: number;
    ocorridoEm: Date;
  }): LeituraIot {
    if (!Number.isInteger(input.input) || input.input < 0) {
      throw new Error('Número da porta (input) deve ser um inteiro não negativo');
    }
    if (!Number.isFinite(input.valor)) {
      throw new Error('Valor da leitura deve ser numérico');
    }
    if (Number.isNaN(input.ocorridoEm.getTime())) {
      throw new Error('Instante da leitura (ocorridoEm) inválido');
    }
    return new LeituraIot({
      idLeituraIot: input.idLeituraIot,
      dispositivoId: input.dispositivoId,
      input: input.input,
      contexto: input.contexto,
      valor: input.valor,
      ocorridoEm: input.ocorridoEm,
      // Duas leituras da mesma porta no mesmo instante são a mesma leitura.
      chaveEvento: `${input.dispositivoId}:${input.input}:${input.ocorridoEm.toISOString()}`,
    });
  }

  static restaurar(props: LeituraIotProps): LeituraIot {
    return new LeituraIot(props);
  }

  get idLeituraIot(): string {
    return this.props.idLeituraIot;
  }
  get dispositivoId(): string {
    return this.props.dispositivoId;
  }
  get input(): number {
    return this.props.input;
  }
  get contexto(): ContextoIot {
    return this.props.contexto;
  }
  get valor(): number {
    return this.props.valor;
  }
  get ocorridoEm(): Date {
    return this.props.ocorridoEm;
  }
  get chaveEvento(): string {
    return this.props.chaveEvento;
  }
}
