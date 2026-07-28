import { StatusRecurso } from '@shared/domain/status-recurso.js';

interface CrachaProps {
  idCracha: string;
  codigo: string;
  nome: string;
  status: StatusRecurso;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Crachá — identifica uma pessoa nos terminais. Raiz de agregado.
 *
 * Migrado de Octopus `Cracha` + `Cracha.Validar`: código e nome são
 * obrigatórios (invariantes). A unicidade do código é verificada no use-case.
 * As digitais são um agregado à parte (CrachaBiometria), geridas pelo
 * operis-bio-bridge — não fazem parte deste CRUD.
 */
export class Cracha {
  private constructor(private props: CrachaProps) {}

  static criar(input: {
    idCracha: string;
    codigo: string;
    nome: string;
    status?: StatusRecurso | undefined;
  }): Cracha {
    const agora = new Date();
    return new Cracha({
      idCracha: input.idCracha,
      codigo: Cracha.exigir(input.codigo, 'Código do crachá é inválido'),
      nome: Cracha.exigir(input.nome, 'Nome é inválido'),
      status: input.status ?? StatusRecurso.ATIVO,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: CrachaProps): Cracha {
    return new Cracha(props);
  }

  /** Aplica os campos editáveis (paridade com CrachaRN.EditarCracha). */
  alterar(input: { codigo: string; nome: string; status?: StatusRecurso | undefined }): void {
    this.props.codigo = Cracha.exigir(input.codigo, 'Código do crachá é inválido');
    this.props.nome = Cracha.exigir(input.nome, 'Nome é inválido');
    if (input.status !== undefined) this.props.status = input.status;
    this.props.atualizadoEm = new Date();
  }

  private static exigir(valor: string, mensagem: string): string {
    const limpo = (valor ?? '').trim();
    if (limpo.length === 0) {
      throw new Error(mensagem);
    }
    return limpo;
  }

  get idCracha(): string {
    return this.props.idCracha;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get nome(): string {
    return this.props.nome;
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
}
