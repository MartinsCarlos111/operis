import type { EntradaIot } from './entrada-iot.js';

interface DispositivoIotProps {
  idDispositivoIot: string;
  serial: string;
  nome: string;
  modelo: number;
  versaoFirmware: string | null;
  ip: string | null;
  centroTrabalho: string | null;
  estabelecimentoId: string;
  entradas: EntradaIot[];
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Dispositivo coletor IoT. Raiz de agregado — as entradas só existem através
 * dele. Migrado de Octopus `IOT` + `CentroTrabalhoIOT`.
 *
 * O `serial` (ex-serialIOT) é a identidade do aparelho e, por decisão do
 * firmware, é também o client_id MQTT. O status online NÃO é campo desta
 * entidade: é derivado em tempo real das conexões do broker, pois estado de
 * conexão persistido fica obsoleto no instante seguinte.
 */
export class DispositivoIot {
  private constructor(private props: DispositivoIotProps) {}

  static criar(input: {
    idDispositivoIot: string;
    serial: string;
    nome: string;
    estabelecimentoId: string;
    modelo?: number | undefined;
    versaoFirmware?: string | null | undefined;
    ip?: string | null | undefined;
    centroTrabalho?: string | null | undefined;
  }): DispositivoIot {
    const serial = DispositivoIot.exigirTexto(
      input.serial,
      'Serial do dispositivo não pode estar em branco',
    );
    const nome = DispositivoIot.exigirTexto(
      input.nome,
      'Nome do dispositivo não pode estar em branco',
    );
    const agora = new Date();
    return new DispositivoIot({
      idDispositivoIot: input.idDispositivoIot,
      serial,
      nome,
      modelo: input.modelo ?? 0,
      versaoFirmware: input.versaoFirmware ?? null,
      ip: input.ip ?? null,
      centroTrabalho: input.centroTrabalho?.trim() || null,
      estabelecimentoId: input.estabelecimentoId,
      entradas: [],
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: DispositivoIotProps): DispositivoIot {
    return new DispositivoIot(props);
  }

  alterar(input: {
    nome: string;
    modelo?: number | undefined;
    ip?: string | null | undefined;
    centroTrabalho?: string | null | undefined;
  }): void {
    this.props.nome = DispositivoIot.exigirTexto(
      input.nome,
      'Nome do dispositivo não pode estar em branco',
    );
    if (input.modelo !== undefined) this.props.modelo = input.modelo;
    if (input.ip !== undefined) this.props.ip = input.ip;
    if (input.centroTrabalho !== undefined) {
      this.props.centroTrabalho = input.centroTrabalho?.trim() || null;
    }
    this.props.atualizadoEm = new Date();
  }

  /**
   * Substitui o conjunto de entradas. É assim (e não add/remove avulsos)
   * porque a tela edita a configuração do coletor como um todo e o firmware
   * recebe a configuração inteira de uma vez.
   */
  definirEntradas(entradas: EntradaIot[]): void {
    const vistas = new Set<string>();
    for (const entrada of entradas) {
      const chave = `${entrada.tipo}:${entrada.input}`;
      if (vistas.has(chave)) {
        throw new Error(`Porta ${entrada.tipo} ${entrada.input} configurada mais de uma vez`);
      }
      vistas.add(chave);
    }
    this.props.entradas = entradas;
    this.props.atualizadoEm = new Date();
  }

  /** Routing key do dispositivo no broker: `devices.<modelo>.<serial>`. */
  get routingKey(): string {
    return `devices.${this.props.modelo}.${this.props.serial}`;
  }

  private static exigirTexto(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) throw new Error(mensagem);
    return limpo;
  }

  get idDispositivoIot(): string {
    return this.props.idDispositivoIot;
  }
  get serial(): string {
    return this.props.serial;
  }
  get nome(): string {
    return this.props.nome;
  }
  get modelo(): number {
    return this.props.modelo;
  }
  get versaoFirmware(): string | null {
    return this.props.versaoFirmware;
  }
  get ip(): string | null {
    return this.props.ip;
  }
  get centroTrabalho(): string | null {
    return this.props.centroTrabalho;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
  get entradas(): readonly EntradaIot[] {
    return this.props.entradas;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
