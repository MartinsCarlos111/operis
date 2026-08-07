import type { CalculoIndicadores } from '../../domain/entities/calculo-indicadores.js';

export interface CalculoIndicadoresDTO {
  idCalculoIndicadores: string;
  estabelecimentoId: string;
  centroTrabalhoId: string;
  turnoId: string | null;
  diaTurno: string;
  qtdProduzida: number;
  qtdRefugo: number;
  qtdPerda: number;
  qtdMeta: number;
  tempoProducaoSeg: number;
  tempoParadaSeg: number;
  tempoPreparacaoSeg: number;
  tempoDisponivelSeg: number;
  tempoTotalSeg: number;
  tempoManutencaoSeg: number;
  disponibilidade: number;
  eficiencia: number;
  qualidade: number;
  oee: number;
  teep: number;
  perdaFinanceira: number;
  custoMaquinaHora: number;
  recalcular: boolean;
}

export function paraCalculoIndicadoresDTO(c: CalculoIndicadores): CalculoIndicadoresDTO {
  return {
    idCalculoIndicadores: c.idCalculoIndicadores,
    estabelecimentoId: c.estabelecimentoId,
    centroTrabalhoId: c.centroTrabalhoId,
    turnoId: c.turnoId,
    diaTurno: c.diaTurno.toISOString(),
    qtdProduzida: c.qtdProduzida,
    qtdRefugo: c.qtdRefugo,
    qtdPerda: c.qtdPerda,
    qtdMeta: c.qtdMeta,
    tempoProducaoSeg: c.tempoProducaoSeg,
    tempoParadaSeg: c.tempoParadaSeg,
    tempoPreparacaoSeg: c.tempoPreparacaoSeg,
    tempoDisponivelSeg: c.tempoDisponivelSeg,
    tempoTotalSeg: c.tempoTotalSeg,
    tempoManutencaoSeg: c.tempoManutencaoSeg,
    disponibilidade: c.disponibilidade,
    eficiencia: c.eficiencia,
    qualidade: c.qualidade,
    oee: c.oee,
    teep: c.teep,
    perdaFinanceira: c.perdaFinanceira,
    custoMaquinaHora: c.custoMaquinaHora,
    recalcular: c.recalcular,
  };
}

/** DTO do dashboard de acompanhamento de produção (paridade `AcompanhamentoProducao`). */
export interface AcompanhamentoProducaoDTO {
  centroTrabalhoId: string;
  centroTrabalhoCodigo: string;
  centroTrabalhoDescricao: string;
  turnoId: string | null;
  diaTurno: string;
  qtdProduzida: number;
  qtdRefugo: number;
  qtdMeta: number;
  disponibilidade: number;
  eficiencia: number;
  qualidade: number;
  oee: number;
  teep: number;
}

export interface DisponivelProduzindoParadaDTO {
  centroTrabalhoId: string;
  centroTrabalhoCodigo: string;
  centroTrabalhoDescricao: string;
  tempoDisponivelSeg: number;
  tempoProducaoSeg: number;
  tempoParadaSeg: number;
  tempoOciosidadeSeg: number;
}