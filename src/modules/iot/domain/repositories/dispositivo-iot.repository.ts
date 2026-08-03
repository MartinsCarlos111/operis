import type { DispositivoIot } from '../entities/dispositivo-iot.js';

/** Critério de listagem paginada, no mesmo formato dos demais módulos. */
export interface CriterioListagemDispositivoIot {
  estabelecimentoId: string;
  startIndex: number;
  maxRows: number;
  /** Busca textual opcional sobre serial/nome/centro de trabalho. */
  termo?: string | undefined;
}

/**
 * Port do agregado DispositivoIot. `salvar` persiste o dispositivo junto de
 * suas entradas (o agregado é gravado inteiro, como a tela o edita).
 */
export interface DispositivoIotRepository {
  buscarPorId(idDispositivoIot: string, estabelecimentoId: string): Promise<DispositivoIot | null>;
  /** Resolve unicidade do serial — que é também o client_id no broker. */
  buscarPorSerial(serial: string): Promise<DispositivoIot | null>;
  listar(criterio: CriterioListagemDispositivoIot): Promise<DispositivoIot[]>;
  contar(estabelecimentoId: string, termo?: string | undefined): Promise<number>;
  salvar(dispositivo: DispositivoIot): Promise<void>;
  excluir(idDispositivoIot: string): Promise<void>;
}
