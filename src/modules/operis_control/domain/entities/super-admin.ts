import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { Email } from '../value-objects/email.js';

interface SuperAdminProps {
  idSuperAdmin: string;
  nome: string;
  email: Email;
  senhaHash: string;
  status: StatusRecurso;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * SuperAdmin — equipe interna de manutenção/suporte do operis. Sem relação
 * com Tenant: é quem cria e gerencia tenants, e os únicos que sabem que eles
 * existem. Login isolado (painel próprio), nunca misturado com o de clientes.
 */
export class SuperAdmin {
  private constructor(private props: SuperAdminProps) {}

  static criar(input: {
    idSuperAdmin: string;
    nome: string;
    email: Email;
    senhaHash: string;
  }): SuperAdmin {
    const nome = input.nome.trim();
    if (nome.length < 2) {
      throw new Error('O nome do super-admin deve ter ao menos 2 caracteres');
    }
    const agora = new Date();
    return new SuperAdmin({
      idSuperAdmin: input.idSuperAdmin,
      nome,
      email: input.email,
      senhaHash: input.senhaHash,
      status: StatusRecurso.ATIVO,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: SuperAdminProps): SuperAdmin {
    return new SuperAdmin(props);
  }

  get idSuperAdmin(): string {
    return this.props.idSuperAdmin;
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
