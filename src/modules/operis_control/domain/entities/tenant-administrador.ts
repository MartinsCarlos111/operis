import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { Email } from '../value-objects/email.js';

interface TenantAdministradorProps {
  idTenantAdministrador: string;
  tenantId: string;
  nome: string;
  email: Email;
  senhaHash: string;
  status: StatusRecurso;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * TenantAdministrador — o administrador de UM tenant, criado pelo super-admin
 * junto com o tenant. Vive no Control Plane (não no banco do tenant) porque o
 * login precisa descobrir "qual tenant" a partir do email antes de saber qual
 * banco consultar. Referencia o Tenant por id (agregados distintos).
 */
export class TenantAdministrador {
  private constructor(private props: TenantAdministradorProps) {}

  static criar(input: {
    idTenantAdministrador: string;
    tenantId: string;
    nome: string;
    email: Email;
    senhaHash: string;
  }): TenantAdministrador {
    const nome = input.nome.trim();
    if (nome.length < 2) {
      throw new Error('O nome do administrador deve ter ao menos 2 caracteres');
    }
    const agora = new Date();
    return new TenantAdministrador({
      idTenantAdministrador: input.idTenantAdministrador,
      tenantId: input.tenantId,
      nome,
      email: input.email,
      senhaHash: input.senhaHash,
      status: StatusRecurso.ATIVO,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: TenantAdministradorProps): TenantAdministrador {
    return new TenantAdministrador(props);
  }

  get idTenantAdministrador(): string {
    return this.props.idTenantAdministrador;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get email(): Email {
    return this.props.email;
  }

  get senhaHash(): string {
    return this.props.senhaHash;
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
}
