import { StatusRecurso } from '@shared/domain/status-recurso.js';

interface NivelAcessoProps {
  idNivelAcesso: string;
  nome: string;
  descricao: string;
  status: StatusRecurso;
  estabelecimentoId: string;
  /** Referências por identidade ao catálogo de Permissao (agregado externo). */
  permissaoIds: Set<string>;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * NivelAcesso — raiz de agregado. Perfil de acesso escopado por estabelecimento
 * (multi-tenant). Seleciona quais permissões do catálogo este nível
 * disponibiliza; a referência a Permissao é por id (agregados se referenciam
 * por identidade, nunca por objeto). Ex.: "Operacional" com permissões do
 * grupo principal ou de manufatura.
 */
export class NivelAcesso {
  private constructor(private props: NivelAcessoProps) {}

  static criar(input: {
    idNivelAcesso: string;
    nome: string;
    estabelecimentoId: string;
    descricao?: string | undefined;
    permissaoIds?: Iterable<string> | undefined;
  }): NivelAcesso {
    const nome = input.nome.trim();
    if (nome.length < 2) {
      throw new Error('O nome do nível de acesso deve ter ao menos 2 caracteres');
    }
    const agora = new Date();
    return new NivelAcesso({
      idNivelAcesso: input.idNivelAcesso,
      nome,
      descricao: input.descricao?.trim() ?? '',
      status: StatusRecurso.ATIVO,
      estabelecimentoId: input.estabelecimentoId,
      permissaoIds: new Set(input.permissaoIds ?? []),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: NivelAcessoProps): NivelAcesso {
    return new NivelAcesso(props);
  }

  get idNivelAcesso(): string {
    return this.props.idNivelAcesso;
  }

  get nome(): string {
    return this.props.nome;
  }

  get descricao(): string {
    return this.props.descricao;
  }

  get status(): StatusRecurso {
    return this.props.status;
  }

  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }

  get permissaoIds(): ReadonlySet<string> {
    return this.props.permissaoIds;
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

  concederPermissao(permissaoId: string): void {
    this.props.permissaoIds.add(permissaoId);
    this.props.atualizadoEm = new Date();
  }

  revogarPermissao(permissaoId: string): void {
    this.props.permissaoIds.delete(permissaoId);
    this.props.atualizadoEm = new Date();
  }

  /** Substitui a seleção inteira (fluxo de edição do perfil no front). */
  definirPermissoes(permissaoIds: Iterable<string>): void {
    this.props.permissaoIds = new Set(permissaoIds);
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
