import { exigirTexto } from './calendario.js';

interface QualidadeItemProps {
  idQualidadeItem: string;
  descricao: string;
  estabelecimentoId: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Qualidade do item (migrado de Octopus `QualidadeItem`). Cadastro simples de
 * apoio — só a descrição, sem código nem status, como no legado.
 */
export class QualidadeItem {
  private constructor(private props: QualidadeItemProps) {}

  static criar(input: {
    idQualidadeItem: string;
    descricao: string;
    estabelecimentoId: string;
  }): QualidadeItem {
    const agora = new Date();
    return new QualidadeItem({
      idQualidadeItem: input.idQualidadeItem,
      descricao: exigirTexto(
        input.descricao,
        'Descrição da Qualidade do Item não pode estar em branco',
      ),
      estabelecimentoId: input.estabelecimentoId,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: QualidadeItemProps): QualidadeItem {
    return new QualidadeItem(props);
  }

  alterar(input: { descricao: string }): void {
    this.props.descricao = exigirTexto(
      input.descricao,
      'Descrição da Qualidade do Item não pode estar em branco',
    );
    this.props.atualizadoEm = new Date();
  }

  get idQualidadeItem(): string {
    return this.props.idQualidadeItem;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get estabelecimentoId(): string {
    return this.props.estabelecimentoId;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }
}
