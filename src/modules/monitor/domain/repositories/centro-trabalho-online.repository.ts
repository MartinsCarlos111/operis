import type { CentroTrabalhoOnline, StatusCentroTrabalhoOnline } from '../entities/centro-trabalho-online.js';

export interface CriterioListagemCentrosTrabalhoOnline {
  estabelecimentoId: string;
  /// Filtra por status (painel específico de paradas, produzindo, etc.).
  status?: StatusCentroTrabalhoOnline | undefined;
  /// Filtra por grupo de máquina (paridade com `ListarCentrosTrabalhoOnline`).
  grupoMaquinaId?: string | undefined;
}

/**
 * Port do agregado `CentroTrabalhoOnline` — repositório com upsert idempotente
 * por centro de trabalho (UNIQUE no schema).
 */
export interface CentroTrabalhoOnlineRepository {
  buscarPorCentroTrabalho(centroTrabalhoId: string): Promise<CentroTrabalhoOnline | null>;
  listar(criterio: CriterioListagemCentrosTrabalhoOnline): Promise<ReadonlyArray<CentroTrabalhoOnline>>;
  salvar(snapshot: CentroTrabalhoOnline): Promise<void>;
}

/**
 * Resolve a "leitura do chão de fábrica" para o snapshot: qual movimento está
 * aberto, qual ordem está em curso, qual o último indicador. Fronteira que
 * evita importar o módulo manufatura (importa somente a interface).
 */
export interface LeituraChaoDeFabrica {
  listarMovimentosAbertos(centroTrabalhoId: string): Promise<ReadonlyArray<{
    movimentoId: string;
    tipo: string;
    inicio: Date;
  }>>;
  listarOrdensEmCurso(centroTrabalhoId: string): Promise<ReadonlyArray<{
    ordemProducaoId: string;
    codigo: string;
  }>>;
  buscarIndicadorAtual(centroTrabalhoId: string): Promise<string | null>;
}