import type { CalculoIndicadores } from '../../domain/entities/calculo-indicadores.js';
import type { CalculoIndicadoresRepository } from '../../domain/repositories/calculo-indicadores.repositories.js';
import type {
  AcompanhamentoProducaoDTO,
  CalculoIndicadoresDTO,
  DisponivelProduzindoParadaDTO,
} from '../dtos/indicadores.dtos.js';
import { paraCalculoIndicadoresDTO } from '../dtos/indicadores.dtos.js';

/**
 * Lista os agregados de indicadores por período (paridade com
 * `ListarCalculoIndicadores` — painel de análise). Paginação no padrão do
 * projeto (startIndex/maxRows).
 */
export class ListarCalculoIndicadoresUseCase {
  constructor(private readonly repos: CalculoIndicadoresRepository) {}

  async executar(criterio: {
    estabelecimentoId: string;
    centroTrabalhoId?: string | undefined;
    turnoId?: string | undefined;
    dataInicio?: Date | undefined;
    dataFim?: Date | undefined;
    startIndex: number;
    maxRows: number;
  }): Promise<{ itens: CalculoIndicadoresDTO[]; total: number }> {
    const [itens, total] = await Promise.all([
      this.repos.listar(criterio),
      this.repos.contar(criterio),
    ]);
    return { itens: itens.map(paraCalculoIndicadoresDTO), total };
  }
}

/**
 * Lista o acompanhamento de produção consolidado por dia/mês (paridade com
 * `CalculoIndicadoresDAO.ListarAcompanhamentoProducao`).
 */
export class ListarAcompanhamentoProducaoUseCase {
  constructor(private readonly repos: CalculoIndicadoresRepository) {}

  async executar(criterio: {
    estabelecimentoId: string;
    dataInicio: Date;
    dataFim: Date;
    centroTrabalhoId?: string | undefined;
  }): Promise<AcompanhamentoProducaoDTO[]> {
    const linhas = await this.repos.listar({
      estabelecimentoId: criterio.estabelecimentoId,
      centroTrabalhoId: criterio.centroTrabalhoId,
      dataInicio: criterio.dataInicio,
      dataFim: criterio.dataFim,
      startIndex: 0,
      maxRows: 10_000,
    });
    // Filtra só a consolidação do dia (turnoId IS NULL) — paridade com o
    // subselect `MAX … idTurno IS NULL` do legado.
    const dias = linhas.filter((l: CalculoIndicadores) => l.turnoId === null);
    return dias.map((c: CalculoIndicadores) => ({
      centroTrabalhoId: c.centroTrabalhoId,
      centroTrabalhoCodigo: '',
      centroTrabalhoDescricao: '',
      turnoId: c.turnoId,
      diaTurno: c.diaTurno.toISOString(),
      qtdProduzida: c.qtdProduzida,
      qtdRefugo: c.qtdRefugo,
      qtdMeta: c.qtdMeta,
      disponibilidade: c.disponibilidade,
      eficiencia: c.eficiencia,
      qualidade: c.qualidade,
      oee: c.oee,
      teep: c.teep,
    }));
  }
}

/**
 * Agrega tempos Disponível/Produzindo/Parada/Ociosidade por centro (paridade
 * com `DisponivelProduzindoParadaDAO`). Inclui filtros opcionais por Grupo de
 * Máquina/Área etc — aqui só `centroTrabalhoId` direto.
 */
export class ListarDisponivelProduzindoParadaUseCase {
  constructor(private readonly repos: CalculoIndicadoresRepository) {}

  async executar(criterio: {
    estabelecimentoId: string;
    dataInicio: Date;
    dataFim: Date;
    centroTrabalhoId?: string | undefined;
  }): Promise<DisponivelProduzindoParadaDTO[]> {
    const linhas = await this.repos.listar({
      estabelecimentoId: criterio.estabelecimentoId,
      centroTrabalhoId: criterio.centroTrabalhoId,
      dataInicio: criterio.dataInicio,
      dataFim: criterio.dataFim,
      startIndex: 0,
      maxRows: 10_000,
    });
    // Agrega por centroTurno -> mas como só detalhe por turno é retornado,
    // soma por centro.
    const porCentro = new Map<string, DisponivelProduzindoParadaDTO>();
    for (const c of linhas) {
      const atual = porCentro.get(c.centroTrabalhoId);
      const tempoDisponivel = c.tempoDisponivelSeg;
      const tempoProducao = c.tempoProducaoSeg;
      const tempoParada = c.tempoParadaSeg;
      const tempoOciosidade = Math.max(0, tempoDisponivel - tempoProducao - tempoParada);
      if (atual) {
        atual.tempoDisponivelSeg += tempoDisponivel;
        atual.tempoProducaoSeg += tempoProducao;
        atual.tempoParadaSeg += tempoParada;
        atual.tempoOciosidadeSeg += tempoOciosidade;
      } else {
        porCentro.set(c.centroTrabalhoId, {
          centroTrabalhoId: c.centroTrabalhoId,
          centroTrabalhoCodigo: '',
          centroTrabalhoDescricao: '',
          tempoDisponivelSeg: tempoDisponivel,
          tempoProducaoSeg: tempoProducao,
          tempoParadaSeg: tempoParada,
          tempoOciosidadeSeg: tempoOciosidade,
        });
      }
    }
    return [...porCentro.values()];
  }
}