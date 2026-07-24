/**
 * Porta para geração de identificadores únicos, compartilhada pelos contextos.
 * Mantém o domínio livre de qualquer biblioteca concreta de uuid e permite um
 * stub determinístico nos testes.
 */
export interface GeradorId {
  gerar(): string;
}
