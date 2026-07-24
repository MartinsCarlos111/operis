import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { Slug } from '../value-objects/slug.js';
import type { ConfiguracaoBancoTenant } from './configuracao-banco-tenant.js';

interface TenantProps {
  idTenant: string;
  nome: string;
  slug: Slug;
  status: StatusRecurso;
  banco: ConfiguracaoBancoTenant | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Tenant — raiz de agregado do Control Plane. Representa um cliente da
 * plataforma; a configuração do banco dedicado é parte do agregado (1:1) e
 * pode ser trocada sem recriar o tenant (migração de banco sem impacto).
 * Só super-admins conhecem esta entidade.
 */
export class Tenant {
  private constructor(private props: TenantProps) {}

  static criar(input: { idTenant: string; nome: string; slug: Slug }): Tenant {
    const nome = input.nome.trim();
    if (nome.length < 2) {
      throw new Error('O nome do tenant deve ter ao menos 2 caracteres');
    }
    const agora = new Date();
    return new Tenant({
      idTenant: input.idTenant,
      nome,
      slug: input.slug,
      status: StatusRecurso.ATIVO,
      banco: null,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  get idTenant(): string {
    return this.props.idTenant;
  }

  get nome(): string {
    return this.props.nome;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get status(): StatusRecurso {
    return this.props.status;
  }

  get banco(): ConfiguracaoBancoTenant | null {
    return this.props.banco;
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

  /** Associa (ou troca) o banco dedicado — a migração entre bancos passa por aqui. */
  definirBanco(banco: ConfiguracaoBancoTenant): void {
    this.props.banco = banco;
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
