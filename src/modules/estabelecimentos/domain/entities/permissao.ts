import { ChavePermissao } from '../value-objects/chave-permissao.js';

interface PermissaoProps {
  idPermissao: string;
  chave: ChavePermissao;
  descricao: string;
  criadoEm: Date;
}

/**
 * Permissao — item do catálogo de permissões. Tem identidade (id) porque o
 * catálogo é gerenciável, mas a verificação em runtime usa a chave (VO).
 * O grupo é derivado da chave — não se armazena estado que pode divergir.
 */
export class Permissao {
  private constructor(private props: PermissaoProps) {}

  static criar(input: {
    idPermissao: string;
    chave: ChavePermissao;
    descricao: string;
  }): Permissao {
    const descricao = input.descricao.trim();
    if (descricao.length < 2) {
      throw new Error('A descrição da permissão deve ter ao menos 2 caracteres');
    }
    return new Permissao({
      idPermissao: input.idPermissao,
      chave: input.chave,
      descricao,
      criadoEm: new Date(),
    });
  }

  static restaurar(props: PermissaoProps): Permissao {
    return new Permissao(props);
  }

  get idPermissao(): string {
    return this.props.idPermissao;
  }

  get chave(): ChavePermissao {
    return this.props.chave;
  }

  get grupo(): string {
    return this.props.chave.grupo;
  }

  get descricao(): string {
    return this.props.descricao;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }
}
