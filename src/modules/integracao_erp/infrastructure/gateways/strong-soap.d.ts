/**
 * Shim de tipos para `strong-soap` que não publica `.d.ts` próprios. As
 * declarações abaixo só cobrem o que o `StrongSoapClienteErp` usa — extensões
 * podem ser adicionadas conforme novas operadoras SOAP surgam.
 */
declare module 'strong-soap' {
  export interface SoapHeader {
    [key: string]: unknown;
  }

  export interface Client {
    addSoapHeader(header: SoapHeader | string): void;
    [metodo: string]: ((payload: unknown, opts?: { timeout?: number }) => Promise<unknown>) | unknown;
  }

  export interface CreateClientOptions {
    overrideRootElement?: { namespace: string } | undefined;
    [key: string]: unknown;
  }

  export function createClientAsync(url: string, options?: CreateClientOptions): Promise<Client>;
}