import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { exigirTexto } from './calendario.js';

interface ItemProps {
  idItem: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  estabelecimentoId: string;
  /** Referências por identidade a QualidadeItem (agregado externo). */
  qualidadeItemIds: Set<string>;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Item (migrado de Octopus `Item`). O vínculo com QualidadeItem era uma lista
 * de descrições serializada em string no legado; aqui é uma referência por
 * identidade (Set de ids) — mesmo padrão de NivelAcesso.permissaoIds.
 */
export class Item {
  private constructor(private props: ItemProps) {}

  static criar(input: {
    idItem: string;
    codigo: string;
    descricao: string;
    estabelecimentoId: string;
    qualidadeItemIds?: Iterable<string> | undefined;
  }): Item {
    const agora = new Date();
    return new Item({
      idItem: input.idItem,
      codigo: exigirTexto(input.codigo, 'Código do Item não pode estar em branco'),
      descricao: exigirTexto(input.descricao, 'Descrição do Item não pode estar em branco'),
      status: StatusRecurso.ATIVO,
      estabelecimentoId: input.estabelecimentoId,
      qualidadeItemIds: new Set(input.qualidadeItemIds ?? []),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: ItemProps): Item {
    return new Item(props);
  }

  alterar(input: {
    codigo: string;
    descricao: string;
    status?: StatusRecurso | undefined;
    qualidadeItemIds?: Iterable<string> | undefined;
  }): void {
    this.props.codigo = exigirTexto(input.codigo, 'Código do Item não pode estar em branco');
    this.props.descricao = exigirTexto(
      input.descricao,
      'Descrição do Item não pode estar em branco',
    );
    if (input.status) this.props.status = input.status;
    if (input.qualidadeItemIds) {
      this.props.qualidadeItemIds = new Set(input.qualidadeItemIds);
    }
    this.props.atualizadoEm = new Date();
  }

  get idItem(): string {
    return this.props.idItem;
  }
  get codigo(): string {
    return this.props.codigo;
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
  get qualidadeItemIds(): ReadonlySet<string> {
    return this.props.qualidadeItemIds;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
