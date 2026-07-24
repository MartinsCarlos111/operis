/**
 * Políticas de login do usuário. Conjunto flexível de regras — modelado como
 * value object sobre um objeto livre para não exigir migração a cada nova
 * política. Os campos abaixo são os conhecidos; outros são preservados.
 */
export interface PoliticasLoginProps {
  /** Exige múltiplo fator de autenticação. */
  exigeMfa?: boolean;
  /** Dias até a senha expirar (undefined = não expira). */
  expiracaoSenhaDias?: number;
  /** Máximo de tentativas antes de bloquear. */
  maxTentativas?: number;
  [chave: string]: unknown;
}

export class PoliticasLogin {
  private constructor(private readonly props: PoliticasLoginProps) {}

  static criar(props: PoliticasLoginProps = {}): PoliticasLogin {
    if (props.expiracaoSenhaDias !== undefined && props.expiracaoSenhaDias < 0) {
      throw new Error('expiracaoSenhaDias não pode ser negativo');
    }
    if (props.maxTentativas !== undefined && props.maxTentativas < 1) {
      throw new Error('maxTentativas deve ser ao menos 1');
    }
    return new PoliticasLogin({ ...props });
  }

  get exigeMfa(): boolean {
    return this.props.exigeMfa ?? false;
  }

  toJSON(): PoliticasLoginProps {
    return { ...this.props };
  }
}
