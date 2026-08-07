interface FirmwareIotProps {
  idFirmwareIot: string;
  modelo: number;
  versao: string;
  chaveObjeto: string;
  tamanhoBytes: number;
  estabelecimentoId: string;
  criadoEm: Date;
}

/**
 * Binário de firmware enviado pelo admin (migrado de Octopus
 * `firmwares/{model}/firmware.bin`, mas versionado — o legado sobrescrevia o
 * único arquivo por modelo, aqui cada upload vira um registro novo). O
 * binário em si vive no object storage do tenant; esta entidade só guarda os
 * metadados — imutável após criada (um upload novo é um novo `FirmwareIot`,
 * nunca uma edição).
 */
export class FirmwareIot {
  private constructor(private props: FirmwareIotProps) {}

  static criar(input: {
    idFirmwareIot: string;
    modelo: number;
    versao: string;
    chaveObjeto: string;
    tamanhoBytes: number;
    estabelecimentoId: string;
  }): FirmwareIot {
    const versao = input.versao.trim();
    if (versao.length === 0) {
      throw new Error('Versão do firmware não pode estar em branco');
    }
    if (input.tamanhoBytes <= 0) {
      throw new Error('Binário de firmware vazio');
    }
    return new FirmwareIot({
      idFirmwareIot: input.idFirmwareIot,
      modelo: input.modelo,
      versao,
      chaveObjeto: input.chaveObjeto,
      tamanhoBytes: input.tamanhoBytes,
      estabelecimentoId: input.estabelecimentoId,
      criadoEm: new Date(),
    });
  }

  static restaurar(props: FirmwareIotProps): FirmwareIot {
    return new FirmwareIot(props);
  }

  get idFirmwareIot(): string {
    return this.props.idFirmwareIot;
  }
  get modelo(): number {
    return this.props.modelo;
  }
  get versao(): string {
    return this.props.versao;
  }
  get chaveObjeto(): string {
    return this.props.chaveObjeto;
  }
  get tamanhoBytes(): number {
    return this.props.tamanhoBytes;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
}
