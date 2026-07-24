import type { DadosConexaoBanco } from './validador-conexao-banco.js';

/**
 * Porta de provisionamento: aplica o schema da aplicação (migrations/push) no
 * banco dedicado recém-cadastrado do tenant — passo "Executa migrations" do
 * fluxo de provisionamento.
 */
export interface ProvisionadorSchemaTenant {
  provisionar(dados: DadosConexaoBanco): Promise<void>;
}
