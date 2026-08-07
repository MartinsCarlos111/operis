import type { preHandlerAsyncHookHandler } from 'fastify';
import type { ClienteSoapErp, ConfiguracaoIntegracaoErp } from './domain/gateways/cliente-soap.js';
import { StrongSoapClienteErp } from './infrastructure/gateways/strong-soap-cliente.js';
import {
  BaixarEtiquetasErpUseCase,
  BaixarOrdensErpUseCase,
  IntegrarMovimentosErpUseCase,
  TestarWebServiceErpUseCase,
} from './application/use-cases/integracao-erp.use-cases.js';

export interface CadeiaAutorizacaoInjetada {
  autenticar: preHandlerAsyncHookHandler;
  resolverTenant: preHandlerAsyncHookHandler;
  exigirEstabelecimento: preHandlerAsyncHookHandler;
  autorizar: (...chaves: string[]) => preHandlerAsyncHookHandler;
}

/**
 * Composition root do módulo Integração ERP (SOAP). Reúne os 4 UCs de
 * integração: testar, baixar ordens, baixar etiquetas e integrar movimentos.
 *
 * A `ConfiguracaoIntegracaoErp` deve vir do Control Plane (via
 * `TenantIntegracao` — a criar). Enquanto não há tela admin, adcione via env
 * ou seed.
 */
export function construirModuloIntegracaoErp(
  _cadeia: CadeiaAutorizacaoInjetada,
  config: ConfiguracaoIntegracaoErp,
) {
  const cliente: ClienteSoapErp = new StrongSoapClienteErp(config);

  const useCases = {
    testar: new TestarWebServiceErpUseCase(cliente),
    baixarOrdens: new BaixarOrdensErpUseCase(cliente, {
      lerParaBaixar: async (ids) => [],
      marcarIntegrada: async () => {},
    }),
    baixarEtiquetas: new BaixarEtiquetasErpUseCase(cliente, {
      lerDisponiveisPorOrdem: async () => [],
      marcarBaixada: async () => {},
    }),
    integrarMovimentos: new IntegrarMovimentosErpUseCase(cliente, {
      lerNaoIntegrados: async () => [],
      marcarIntegrado: async () => {},
    }),
  };

  return {
    cliente,
    useCases,
  };
}