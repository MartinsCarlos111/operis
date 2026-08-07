/**
 * Porta do cliente SOAP do ERP do tenant (migrado de `WsIntegracao` do Octopus
 * — SOAP legado). Cada tenant tem sua URL+AuthHeader próprios, configurados
 * no Control Plane via `TenantIntegracao` (a criar) — aqui ficamos só com a
 * porta de serviço.
 */

export interface AuthHeaderErp {
  usuario: string;
  senha: string;
  /// Ex-CNpj da empresa do tenant; depende do ERP do cliente.
  empresa?: string | undefined;
  /// Token opcional — alguns ERPs usam em vez de user/pass.
  token?: string | undefined;
}

export interface ConfiguracaoIntegracaoErp {
  url: string;
  auth: AuthHeaderErp;
}

/** Resultado de um chamada SOAP genérica. */
export interface ResultadoSoap<T = unknown> {
  /**
   * Nome do método invocado — para log/auditoria (paridade com
   * `Web References\WsIntegracao`).
   */
  metodo: string;
  ok: boolean;
  /** XML de resposta cru (somente quando precisão é exigida pelo caller). */
  xmlResposta?: string | undefined;
  /** JSON já desserializado quando o caller pede. */
  payload?: T | undefined;
  /** Mensagem de erro quando `ok=false`. */
  mensagemErro?: string | undefined;
}

/** Paridade com `ManServiceIntegracao.Especifico(xml)` do legado. */
export type MetodoErp =
  | 'TestarWebService'
  | 'BaixarOrdensProducao'
  | 'ConfirmarOrdensProducaoBaixadas'
  | 'IntegrarMovimentosManufatura'
  | 'BaixarEtiquetasManufatura'
  | 'ConfirmarEtiquetasManufaturaBaixadas'
  | 'Especifico';

export interface ClienteSoapErp {
  invocar<T = unknown>(metodo: MetodoErp, payload: unknown, prazoMs?: number): Promise<ResultadoSoap<T>>;
  encerrar(): Promise<void>;
}