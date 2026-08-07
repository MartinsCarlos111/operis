import type { StatusCentroTrabalhoOnline } from '../../domain/entities/centro-trabalho-online.js';

export interface CentroTrabalhoDTO {
  idCentroTrabalhoOnline: string;
  centroTrabalhoId: string;
  status: StatusCentroTrabalhoOnline;
  movimentoAbertoId: string | null;
  ordemProducaoId: string | null;
  calculoIndicadoresId: string | null;
  ultimaAtualizacao: string;
}

/** Status combinado (conexão + apontamento) exibido no card do dispositivo. */
export type StatusCombinadoDispositivo = 'OFFLINE' | 'PRODUZINDO' | 'PARADA' | 'OCIOSO';

/** Um coletor IoT vinculado a um centro de trabalho — para a tela de cards. */
export interface DispositivoDoCentroDTO {
  id: string;
  nome: string;
  serial: string;
  online: boolean;
  statusCombinado: StatusCombinadoDispositivo;
}

/**
 * Centro de trabalho com seus coletores IoT vinculados, para a tela de
 * Monitoramento de Coletores (um card por centro de trabalho).
 */
export interface CentroTrabalhoComColetoresDTO {
  idCentroTrabalho: string;
  codigo: string;
  descricao: string;
  status: 'ATIVO' | 'INATIVO';
  dispositivos: DispositivoDoCentroDTO[];
  algumOnline: boolean;
}