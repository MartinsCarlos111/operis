import type { StatusRecurso } from '@shared/domain/status-recurso.js';
import type { Calendario } from '../../domain/entities/calendario.js';
import type { GrupoMaquina, RegraDespacho } from '../../domain/entities/grupo-maquina.js';
import type { QualidadeItem } from '../../domain/entities/qualidade-item.js';
import type { Item } from '../../domain/entities/item.js';
import type { CentroTrabalhoItem } from '../../domain/entities/centro-trabalho-item.js';
import type {
  CentroTrabalho,
  MetasCentroTrabalho,
  ParametrosCentroTrabalho,
  VinculosCentroTrabalho,
} from '../../domain/entities/centro-trabalho.js';
import type { OrdemProducao } from '../../domain/entities/ordem-producao.js';

/** Envelope paginado `{ count, model }` — a forma dos GetXxx legados. */
export interface ListaPaginadaDTO<T> {
  count: number;
  model: T[];
}

export interface CalendarioDTO {
  idCalendario: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraCalendarioDTO(calendario: Calendario): CalendarioDTO {
  return {
    idCalendario: calendario.idCalendario,
    codigo: calendario.codigo,
    descricao: calendario.descricao,
    status: calendario.status,
    criadoEm: calendario.criadoEm.toISOString(),
    atualizadoEm: calendario.atualizadoEm.toISOString(),
  };
}

export interface GrupoMaquinaDTO {
  idGrupoMaquina: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  regraDespacho: RegraDespacho;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraGrupoMaquinaDTO(grupo: GrupoMaquina): GrupoMaquinaDTO {
  return {
    idGrupoMaquina: grupo.idGrupoMaquina,
    codigo: grupo.codigo,
    descricao: grupo.descricao,
    status: grupo.status,
    regraDespacho: grupo.regraDespacho,
    criadoEm: grupo.criadoEm.toISOString(),
    atualizadoEm: grupo.atualizadoEm.toISOString(),
  };
}

export interface QualidadeItemDTO {
  idQualidadeItem: string;
  descricao: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraQualidadeItemDTO(qualidade: QualidadeItem): QualidadeItemDTO {
  return {
    idQualidadeItem: qualidade.idQualidadeItem,
    descricao: qualidade.descricao,
    criadoEm: qualidade.criadoEm.toISOString(),
    atualizadoEm: qualidade.atualizadoEm.toISOString(),
  };
}

export interface ItemDTO {
  idItem: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  qualidadeItemIds: string[];
  criadoEm: string;
  atualizadoEm: string;
}

export function paraItemDTO(item: Item): ItemDTO {
  return {
    idItem: item.idItem,
    codigo: item.codigo,
    descricao: item.descricao,
    status: item.status,
    qualidadeItemIds: [...item.qualidadeItemIds],
    criadoEm: item.criadoEm.toISOString(),
    atualizadoEm: item.atualizadoEm.toISOString(),
  };
}

export interface CentroTrabalhoItemDTO {
  idCentroTrabalhoItem: string;
  itemId: string;
  centroTrabalhoId: string;
  cicloProdutivoHora: number | null;
  cicloProdutivoPecaSegundos: number | null;
  tempoPreparacaoSegundos: number | null;
  fatorRefugo: number | null;
  qtdRefugo: number | null;
  qtdPerda: number | null;
  apontarPreparacao: number | null;
  tempoMaquinaSegundos: number | null;
  loteMultiplo: number | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraCentroTrabalhoItemDTO(vinculo: CentroTrabalhoItem): CentroTrabalhoItemDTO {
  return {
    idCentroTrabalhoItem: vinculo.idCentroTrabalhoItem,
    itemId: vinculo.itemId,
    centroTrabalhoId: vinculo.centroTrabalhoId,
    cicloProdutivoHora: vinculo.cicloProdutivoHora,
    cicloProdutivoPecaSegundos: vinculo.cicloProdutivoPecaSegundos,
    tempoPreparacaoSegundos: vinculo.tempoPreparacaoSegundos,
    fatorRefugo: vinculo.fatorRefugo,
    qtdRefugo: vinculo.qtdRefugo,
    qtdPerda: vinculo.qtdPerda,
    apontarPreparacao: vinculo.apontarPreparacao,
    tempoMaquinaSegundos: vinculo.tempoMaquinaSegundos,
    loteMultiplo: vinculo.loteMultiplo,
    ativo: vinculo.ativo,
    criadoEm: vinculo.criadoEm.toISOString(),
    atualizadoEm: vinculo.atualizadoEm.toISOString(),
  };
}

export interface CentroTrabalhoDTO {
  idCentroTrabalho: string;
  codigo: string;
  descricao: string;
  status: StatusRecurso;
  calendarioId: string;
  vinculos: VinculosCentroTrabalho;
  parametros: ParametrosCentroTrabalho;
  metas: MetasCentroTrabalho;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraCentroTrabalhoDTO(centro: CentroTrabalho): CentroTrabalhoDTO {
  return {
    idCentroTrabalho: centro.idCentroTrabalho,
    codigo: centro.codigo,
    descricao: centro.descricao,
    status: centro.status,
    calendarioId: centro.calendarioId,
    vinculos: centro.vinculos,
    parametros: centro.parametros,
    metas: centro.metas,
    criadoEm: centro.criadoEm.toISOString(),
    atualizadoEm: centro.atualizadoEm.toISOString(),
  };
}

export interface OrdemProducaoDTO {
  idOrdemProducao: string;
  codigo: string;
  identificador: string;
  estabelecimentoId: string;
  itemCodigo: string;
  itemDescricao: string | null | undefined;
  quantidadePlanejada: number;
  unidadeMedida: string | undefined;
  status: string | undefined;
  origem: string | undefined;
  modoDistribuicao: string | undefined;
  prioridade: number | undefined;
  centroTrabalhoId: string | null | undefined;
  grupoMaquinaId: string | null | undefined;
  planoProducaoId: string | null | undefined;
  inicioPlanejado: string | null | undefined;
  fimPlanejado: string | null | undefined;
}

export function paraOrdemProducaoDTO(ordem: OrdemProducao): OrdemProducaoDTO {
  const d = ordem.dados;
  return {
    idOrdemProducao: d.idOrdemProducao,
    codigo: d.codigo,
    identificador: d.identificador,
    estabelecimentoId: d.estabelecimentoId,
    itemCodigo: d.itemCodigo,
    itemDescricao: d.itemDescricao,
    quantidadePlanejada: d.quantidadePlanejada,
    unidadeMedida: d.unidadeMedida,
    status: d.status,
    origem: d.origem,
    modoDistribuicao: d.modoDistribuicao,
    prioridade: d.prioridade,
    centroTrabalhoId: d.centroTrabalhoId,
    grupoMaquinaId: d.grupoMaquinaId,
    planoProducaoId: d.planoProducaoId,
    inicioPlanejado: d.inicioPlanejado?.toISOString() ?? null,
    fimPlanejado: d.fimPlanejado?.toISOString() ?? null,
  };
}
