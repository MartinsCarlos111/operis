/**
 * Slug do tenant — identificador público, estável e legível (ex.: "acme-ltda").
 * Autovalidável: minúsculas, números e hífens, sem começar/terminar com hífen.
 */
const PADRAO_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export class Slug {
  private constructor(public readonly valor: string) {}

  static criar(bruto: string): Slug {
    const normalizado = bruto.trim().toLowerCase();
    if (normalizado.length < 2 || normalizado.length > 63 || !PADRAO_SLUG.test(normalizado)) {
      throw new Error(
        `"${bruto}" não é um slug válido (use minúsculas, números e hífens; 2–63 caracteres)`,
      );
    }
    return new Slug(normalizado);
  }

  igual(outro: Slug): boolean {
    return this.valor === outro.valor;
  }

  toString(): string {
    return this.valor;
  }
}
