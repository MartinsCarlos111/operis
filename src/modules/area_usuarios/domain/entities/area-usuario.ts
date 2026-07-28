interface AreaUsuarioProps {
  areaId: string;
  usuarioId: string;
  criadoEm: Date;
}

/**
 * Vínculo N:N usuário ↔ área (migrado de Octopus `AreaUsuario`). Junção pura:
 * identidade é o par (areaId, usuarioId). As regras (ambos existem, par não
 * duplicado) vivem no use-case — dependem de repositórios/gateways, como no
 * AreaUsuarioRN.
 */
export class AreaUsuario {
  private constructor(private props: AreaUsuarioProps) {}

  static criar(input: { areaId: string; usuarioId: string }): AreaUsuario {
    return new AreaUsuario({
      areaId: input.areaId,
      usuarioId: input.usuarioId,
      criadoEm: new Date(),
    });
  }

  static restaurar(props: AreaUsuarioProps): AreaUsuario {
    return new AreaUsuario(props);
  }

  get areaId(): string {
    return this.props.areaId;
  }

  get usuarioId(): string {
    return this.props.usuarioId;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }
}
