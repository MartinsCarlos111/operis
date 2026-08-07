/**
 * Modo elétrico de leitura do sensor (ex-EnumTypeIOT do firmware, paridade com
 * `get_read_mode_from_type`). Não é "digital vs analógica" — isso é decidido
 * pelo número da porta (1-4 = digital, 5 = analógica).
 */
export const TIPOS_ENTRADA_IOT = ['PNP', 'NPN', 'CHANGE_PNP', 'CHANGE_NPN'] as const;

/** Contextos válidos para portas digitais (Input 1-4) — ex-EnumContextIOT 1-10. */
export const CONTEXTOS_DIGITAIS_IOT = [
  'LIGADO_DESLIGADO',
  'PRODUZINDO_NAO_PRODUZINDO',
  'GENERICO',
  'VELOCIDADE_ANGULAR',
  'VELOCIDADE_LINEAR',
  'CONTAGEM_CICLOS',
  'CONTAGEM_ITENS',
  'METROS_PRODUZIDOS',
  'VOLUME_PRODUZIDO',
  'TEMPO_DECORRIDO',
] as const;

/** Contextos válidos para a porta analógica (Input 5) — ex-EnumContextIOT 11-18. */
export const CONTEXTOS_ANALOGICOS_IOT = [
  'TEMPERATURA',
  'PRESSAO',
  'PERCENTUAL',
  'VIBRACAO',
  'VAZAO_VOLUMETRICA',
  'VAZAO_MASSICA',
  'DISTANCIA',
  'CORRENTE',
] as const;

export const CONTEXTOS_IOT = [...CONTEXTOS_DIGITAIS_IOT, ...CONTEXTOS_ANALOGICOS_IOT] as const;

/** ex-EnumFunctionIOT do firmware — como o sinal/pulso da porta é interpretado. */
export const FUNCOES_IOT = ['PULSO', 'ACIONADO', 'ENCODER', 'PULSO_INICIO', 'PULSO_FIM'] as const;

export type TipoEntradaIot = (typeof TIPOS_ENTRADA_IOT)[number];
export type ContextoIot = (typeof CONTEXTOS_IOT)[number];
export type FuncaoIot = (typeof FUNCOES_IOT)[number];

/** Porta 5 é a única analógica do hardware — o restante (1-4) é digital. */
export const INPUT_PORTA_ANALOGICA = 5;
export const INPUTS_PORTAS_DIGITAIS = [1, 2, 3, 4] as const;
export const MAXIMO_ENTRADAS_POR_DISPOSITIVO = INPUTS_PORTAS_DIGITAIS.length + 1;

export function ehContextoValidoParaPorta(contexto: ContextoIot, input: number): boolean {
  const analogicos: readonly string[] = CONTEXTOS_ANALOGICOS_IOT;
  return input === INPUT_PORTA_ANALOGICA
    ? analogicos.includes(contexto)
    : !analogicos.includes(contexto);
}

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
 * `param1..4` têm significado que muda por Contexto (ex.: pulsos por volta,
 * diâmetro da roda, escala de tensão da porta analógica — calculado dentro do
 * próprio firmware); o domínio só repassa os valores, sem validar por
 * contexto, porque essa tabela de significados vive no firmware, não aqui.
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
    if (
      !Number.isInteger(input.input) ||
      !((INPUTS_PORTAS_DIGITAIS as readonly number[]).includes(input.input) ||
        input.input === INPUT_PORTA_ANALOGICA)
    ) {
      throw new Error(
        `Porta (input) deve ser 1-${INPUTS_PORTAS_DIGITAIS.length} (digital) ou ${INPUT_PORTA_ANALOGICA} (analógica) — hardware fixo em ${MAXIMO_ENTRADAS_POR_DISPOSITIVO} portas.`,
      );
    }
    // Porta 5 lida "como digital" usa os mesmos contextos das portas 1-4.
    const tratarComoDigital = input.input !== INPUT_PORTA_ANALOGICA || (input.analogicaComoDigital ?? false);
    if (!ehContextoValidoParaPorta(input.contexto, tratarComoDigital ? 1 : INPUT_PORTA_ANALOGICA)) {
      throw new Error(
        tratarComoDigital
          ? `Contexto '${input.contexto}' é exclusivo da porta analógica.`
          : `Contexto '${input.contexto}' é exclusivo de portas digitais.`,
      );
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
