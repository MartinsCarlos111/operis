/**
 * Dados de conexão em texto puro — existem SOMENTE em memória, no instante da
 * validação/abertura de conexão. Nunca persistidos nem logados assim.
 */
export interface DadosConexaoBanco {
  host: string;
  porta: number;
  nomeBanco: string;
  usuario: string;
  senha: string;
  sslHabilitado: boolean;
}

/**
 * Porta de validação de disponibilidade do banco de um tenant (passo
 * "Validar conexão" do fluxo de cadastro). Lança ConexaoBancoFalhouError se
 * não alcançar/autenticar no banco.
 */
export interface ValidadorConexaoBanco {
  validar(dados: DadosConexaoBanco): Promise<void>;
}
