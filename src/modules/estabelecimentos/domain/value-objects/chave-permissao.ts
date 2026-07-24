/**
 * Value Object da chave de permissão, no padrão `grupo` ou `grupo:acao`
 * (ex.: "principal", "manufatura:create"). Autovalidável: se existe, é válida.
 * Regex herdado da referência de RBAC do projeto.
 */
const PADRAO_CHAVE = /^[a-z][a-z0-9_-]*(:[a-z][a-z0-9_-]*)?$/;

export class ChavePermissao {
  private constructor(public readonly valor: string) {}

  static criar(bruto: string): ChavePermissao {
    const normalizado = bruto.trim().toLowerCase();
    if (!PADRAO_CHAVE.test(normalizado)) {
      throw new Error(
        `"${bruto}" não é uma chave de permissão válida (esperado grupo ou grupo:acao)`,
      );
    }
    return new ChavePermissao(normalizado);
  }

  /** O grupo é a parte antes do ':' (ex.: "manufatura" em "manufatura:create"). */
  get grupo(): string {
    const [grupo] = this.valor.split(':');
    return grupo!;
  }

  igual(outra: ChavePermissao): boolean {
    return this.valor === outra.valor;
  }

  toString(): string {
    return this.valor;
  }
}
