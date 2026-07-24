/**
 * Status de atividade de um recurso do domínio. Um único vocabulário para o
 * conceito "está ativo?" em todos os contextos (Linguagem Ubíqua: um termo,
 * um significado). Espelha o enum StatusRecurso do Prisma.
 */
export const StatusRecurso = {
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
} as const;

export type StatusRecurso = (typeof StatusRecurso)[keyof typeof StatusRecurso];

export function isStatusRecurso(value: string): value is StatusRecurso {
  return value === StatusRecurso.ATIVO || value === StatusRecurso.INATIVO;
}
