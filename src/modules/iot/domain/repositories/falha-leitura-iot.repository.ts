import type { FalhaLeituraIot } from '../entities/falha-leitura-iot.js';

/**
 * Janela de consulta das falhas de um coletor. Filtra por `serial` — não por
 * `dispositivoId` — porque falhas de um aparelho AINDA não cadastrado têm
 * `dispositivoId` nulo e precisam aparecer assim que o serial for registrado.
 */
export interface CriterioFalhasIot {
  serial: string;
  de: Date;
  ate: Date;
}

export interface FalhaLeituraIotRepository {
  /**
   * Grava em lote ignorando duplicatas (chaveEvento), como `salvarLote` de
   * leituras — reentregas MQTT do mesmo descarte não viram falha duplicada.
   */
  salvarLote(falhas: FalhaLeituraIot[]): Promise<number>;
  listar(criterio: CriterioFalhasIot): Promise<FalhaLeituraIot[]>;
  contar(criterio: CriterioFalhasIot): Promise<number>;
}
