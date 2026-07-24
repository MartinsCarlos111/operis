import { StatusRecurso } from '@shared/domain/status-recurso.js';

interface UsuarioEstabelecimentoProps {
  usuarioId: string;
  estabelecimentoId: string;
  nivelAcessoId: string;
  status: StatusRecurso;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * UsuarioEstabelecimento — o vínculo usuário ↔ estabelecimento ↔ nível de
 * acesso (identidade composta usuarioId+estabelecimentoId). É ele que responde
 * "qual nível este usuário tem neste estabelecimento" no fluxo de autorização.
 * Referencia os demais agregados por id (nunca por objeto).
 */
export class UsuarioEstabelecimento {
  private constructor(private props: UsuarioEstabelecimentoProps) {}

  static criar(input: {
    usuarioId: string;
    estabelecimentoId: string;
    nivelAcessoId: string;
  }): UsuarioEstabelecimento {
    const agora = new Date();
    return new UsuarioEstabelecimento({
      usuarioId: input.usuarioId,
      estabelecimentoId: input.estabelecimentoId,
      nivelAcessoId: input.nivelAcessoId,
      status: StatusRecurso.ATIVO,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: UsuarioEstabelecimentoProps): UsuarioEstabelecimento {
    return new UsuarioEstabelecimento(props);
  }

  get usuarioId(): string {
    return this.props.usuarioId;
  }

  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }

  get nivelAcessoId(): string {
    return this.props.nivelAcessoId;
  }

  get status(): StatusRecurso {
    return this.props.status;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  estaAtivo(): boolean {
    return this.props.status === StatusRecurso.ATIVO;
  }

  alterarNivelAcesso(nivelAcessoId: string): void {
    this.props.nivelAcessoId = nivelAcessoId;
    this.props.atualizadoEm = new Date();
  }

  inativar(): void {
    this.props.status = StatusRecurso.INATIVO;
    this.props.atualizadoEm = new Date();
  }

  ativar(): void {
    this.props.status = StatusRecurso.ATIVO;
    this.props.atualizadoEm = new Date();
  }
}
