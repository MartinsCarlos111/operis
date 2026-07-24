import { StatusRecurso } from '@shared/domain/status-recurso.js';
import { Email } from '../value-objects/email.js';
import { PoliticasLogin } from '../value-objects/politicas-login.js';

interface UsuarioProps {
  idUsuario: string;
  nome: string;
  email: Email;
  biometria: boolean;
  status: StatusRecurso;
  politicasLogin: PoliticasLogin;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Usuario — raiz de agregado. A identidade e os dados de login vivem aqui.
 * O vínculo com estabelecimentos e o nível de acesso em cada um NÃO ficam no
 * usuário: são o agregado UsuarioEstabelecimento (multi-tenant). Isso mantém o
 * usuário como uma identidade única, reusável entre estabelecimentos.
 */
export class Usuario {
  private constructor(private props: UsuarioProps) {}

  static criar(input: {
    idUsuario: string;
    nome: string;
    email: Email;
    biometria?: boolean | undefined;
    politicasLogin?: PoliticasLogin | undefined;
  }): Usuario {
    const nome = input.nome.trim();
    if (nome.length < 2) {
      throw new Error('O nome do usuário deve ter ao menos 2 caracteres');
    }
    const agora = new Date();
    return new Usuario({
      idUsuario: input.idUsuario,
      nome,
      email: input.email,
      biometria: input.biometria ?? false,
      status: StatusRecurso.ATIVO,
      politicasLogin: input.politicasLogin ?? PoliticasLogin.criar(),
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  static restaurar(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }

  get idUsuario(): string {
    return this.props.idUsuario;
  }

  get nome(): string {
    return this.props.nome;
  }

  get email(): Email {
    return this.props.email;
  }

  get biometria(): boolean {
    return this.props.biometria;
  }

  get status(): StatusRecurso {
    return this.props.status;
  }

  get politicasLogin(): PoliticasLogin {
    return this.props.politicasLogin;
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

  renomear(nome: string): void {
    const proximo = nome.trim();
    if (proximo.length < 2) {
      throw new Error('O nome do usuário deve ter ao menos 2 caracteres');
    }
    this.props.nome = proximo;
    this.props.atualizadoEm = new Date();
  }

  alterarBiometria(ativa: boolean): void {
    this.props.biometria = ativa;
    this.props.atualizadoEm = new Date();
  }
}
