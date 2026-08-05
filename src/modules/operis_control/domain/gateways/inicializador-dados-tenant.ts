import type { DadosConexaoBanco } from './validador-conexao-banco.js';

export interface AdministradorInicialTenant {
  idUsuario: string;
  nome: string;
  email: string;
}

/** Cria a identidade do administrador no banco dedicado apos o schema existir. */
export interface InicializadorDadosTenant {
  inicializar(dados: DadosConexaoBanco, administrador: AdministradorInicialTenant): Promise<void>;
}
