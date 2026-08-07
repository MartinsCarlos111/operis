import type { ClienteSoapErp, ConfiguracaoIntegracaoErp, MetodoErp, ResultadoSoap } from '../../domain/gateways/cliente-soap.js';

/**
 * Adaptador SOAP baseado em `strong-soap` (substitui o `Web References\WsIntegracao`
 * que era gerado pelo Visual Studio no Octopus legado). Cada tenant sobe o seu
 * próprio `StrongSoapClient` em `createClient()` — o objeto é relativamente
 * caro e fica em cache por instância.
 */
import { createClientAsync, type Client as StrongSoapClient } from 'strong-soap';

export class StrongSoapClienteErp implements ClienteSoapErp {
  private cliente: StrongSoapClient | null = null;
  private readonly config: ConfiguracaoIntegracaoErp;

  constructor(config: ConfiguracaoIntegracaoErp) {
    this.config = config;
  }

  private async obterCliente(): Promise<StrongSoapClient> {
    if (this.cliente) return this.cliente;
    this.cliente = await createClientAsync(this.config.url, {
      overrideRootElement: { namespace: 'tns' },
    } as never);
    this.cliente.addSoapHeader({
      AuthHeader: {
        Usuario: this.config.auth.usuario,
        Senha: this.config.auth.senha,
        ...(this.config.auth.empresa ? { Empresa: this.config.auth.empresa } : {}),
        ...(this.config.auth.token ? { Token: this.config.auth.token } : {}),
      },
    });
    return this.cliente;
  }

  async invocar<T = unknown>(metodo: MetodoErp, payload: unknown, prazoMs = 30_000): Promise<ResultadoSoap<T>> {
    try {
      const cliente = await this.obterCliente();
      const metodoApi = (cliente as unknown as Record<string, (p: unknown, opts: { timeout: number }) => Promise<unknown>>)[metodo];
      if (typeof metodoApi !== 'function') {
        return { metodo, ok: false, mensagemErro: `Método '${metodo}' não encontrado no WSDL do ERP.` };
      }
      const resultado = (await Promise.race([
        metodoApi(payload, { timeout: prazoMs }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout SOAP ${metodo} após ${prazoMs}ms`)), prazoMs),
        ),
      ])) as T;
      return { metodo, ok: true, payload: resultado };
    } catch (err) {
      return { metodo, ok: false, mensagemErro: (err as Error).message };
    }
  }

  async encerrar(): Promise<void> {
    // strong-soap mantém http.Agent interno; nada a fechar explicitamente.
    this.cliente = null;
  }
}