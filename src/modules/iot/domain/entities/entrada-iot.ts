export const TIPOS_ENTRADA_IOT = ['DIGITAL', 'ANALOGICA'] as const;
export const CONTEXTOS_IOT = ['PRODUCAO', 'PARADA', 'QUALIDADE', 'MANUTENCAO'] as const;
export const FUNCOES_IOT = ['CONTADOR', 'STATUS', 'SINAL', 'TEMPERATURA', 'PRESSAO'] as const;

export type TipoEntradaIot = (typeof TIPOS_ENTRADA_IOT)[number];
export type ContextoIot = (typeof CONTEXTOS_IOT)[number];
export type FuncaoIot = (typeof FUNCOES_IOT)[number];

interface EntradaIotProps {
  idEntradaIot: string;
  dispositivoId: string;
  input: number;
  label: string;
  tipo: TipoEntradaIot;
  contexto: ContextoIot;
  funcao: FuncaoIot;
  param1: number | null;
  param2: number | null;
  param3: number | null;
  param4: number | null;
  analogicaComoDigital: boolean;
  habilitado: boolean;
}

/**
 * Entrada digital/analógica de um coletor. Migrada de Octopus `ConfigIOT`.
 *
 * Entidade filha do agregado DispositivoIot — nunca é manipulada fora dele.
 * Os `param1..4` vêm do legado sem semântica definida; são repassados ao
 * firmware como estão, por isso ficam opcionais e sem validação de domínio.
 */
export class EntradaIot {
  private constructor(private props: EntradaIotProps) {}

  static criar(input: {
    idEntradaIot: string;
    dispositivoId: string;
    input: number;
    label: string;
    tipo: TipoEntradaIot;
    contexto: ContextoIot;
    funcao: FuncaoIot;
    param1?: number | null | undefined;
    param2?: number | null | undefined;
    param3?: number | null | undefined;
    param4?: number | null | undefined;
    analogicaComoDigital?: boolean | undefined;
    habilitado?: boolean | undefined;
  }): EntradaIot {
    const label = (input.label ?? '').trim();
    if (label.length === 0) {
      throw new Error('Label da entrada não pode estar em branco');
    }
    if (!Number.isInteger(input.input) || input.input < 0) {
      throw new Error('Número da porta (input) deve ser um inteiro não negativo');
    }
    return new EntradaIot({
      idEntradaIot: input.idEntradaIot,
      dispositivoId: input.dispositivoId,
      input: input.input,
      label,
      tipo: input.tipo,
      contexto: input.contexto,
      funcao: input.funcao,
      param1: input.param1 ?? null,
      param2: input.param2 ?? null,
      param3: input.param3 ?? null,
      param4: input.param4 ?? null,
      analogicaComoDigital: input.analogicaComoDigital ?? false,
      habilitado: input.habilitado ?? true,
    });
  }

  static restaurar(props: EntradaIotProps): EntradaIot {
    return new EntradaIot(props);
  }

  get idEntradaIot(): string {
    return this.props.idEntradaIot;
  }
  get dispositivoId(): string {
    return this.props.dispositivoId;
  }
  get input(): number {
    return this.props.input;
  }
  get label(): string {
    return this.props.label;
  }
  get tipo(): TipoEntradaIot {
    return this.props.tipo;
  }
  get contexto(): ContextoIot {
    return this.props.contexto;
  }
  get funcao(): FuncaoIot {
    return this.props.funcao;
  }
  get param1(): number | null {
    return this.props.param1;
  }
  get param2(): number | null {
    return this.props.param2;
  }
  get param3(): number | null {
    return this.props.param3;
  }
  get param4(): number | null {
    return this.props.param4;
  }
  get analogicaComoDigital(): boolean {
    return this.props.analogicaComoDigital;
  }
  get habilitado(): boolean {
    return this.props.habilitado;
  }
}
