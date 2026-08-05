export interface DefinicaoPermissaoPadrao {
  chave: string;
  grupo: string;
  descricao: string;
}

const grupos: Record<string, { acoes: string[]; descricao: string }> = {
  principal: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Modulo principal' },
  areas: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Cadastro de areas' },
  crachas: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Cadastro de crachas' },
  layouts: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Variaveis e layouts de etiqueta' },
  notificacoes: {
    acoes: ['list', 'create', 'update', 'delete'],
    descricao: 'Regras e condicoes de notificacao',
  },
  impressoras: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Gestao de impressoras' },
  coletores: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Gestao de coletores' },
  'dispositivos-iot': {
    acoes: ['list', 'create', 'update', 'delete'],
    descricao: 'Cadastro de coletores IoT',
  },
  checklist: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Modulo de checklist' },
  manufatura: { acoes: ['list', 'create', 'update', 'delete'], descricao: 'Modulo de manufatura' },
  'manufatura:artigos-ciclos': {
    acoes: ['acesso', 'adicionar', 'editar', 'excluir', 'importar', 'exportar', 'configuracao-campos'],
    descricao: 'Artigos e ciclos de manufatura',
  },
  configuracoes: {
    acoes: ['usuarios', 'niveis_acesso', 'create', 'update'],
    descricao: 'Configuracoes e gestao de acesso',
  },
};

export const CATALOGO_PERMISSOES_PADRAO: DefinicaoPermissaoPadrao[] = Object.entries(grupos).flatMap(
  ([grupo, definicao]) =>
    definicao.acoes.map((acao) => ({
      chave: `${grupo}:${acao}`,
      grupo,
      descricao: `${definicao.descricao} - ${acao}`,
    })),
);
