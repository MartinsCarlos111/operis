import type { ClienteSoapErp, ResultadoSoap } from '../../domain/gateways/cliente-soap.js';
import { AppError } from '@shared/errors/app-error.js';

export class IntegracaoErpIndisponivelError extends AppError {
  readonly code = 'INTEGRACAO_ERP_INDISPONIVEL';
  readonly httpStatus = 503;
  constructor(mensagem: string) {
    super(mensagem);
  }
}

/**
 * Testa o web service do ERP — paridade com `TestarWebServiceIntegracao`.
 * Retorna `ok:true` quando o ERP responde um echo no método de teste.
 */
export class TestarWebServiceErpUseCase {
  constructor(private readonly cliente: ClienteSoapErp) {}

  async executar(): Promise<{ ok: boolean; mensagem?: string | undefined }> {
    const resultado = await this.cliente.invocar('TestarWebService', {});
    if (!resultado.ok) {
      return { ok: false, mensagem: resultado.mensagemErro };
    }
    return { ok: true };
  }
}

export interface EntradaBaixarOrdensErp {
  estabelecimentoId: string;
  idsOrdensProducao: ReadonlyArray<string>;
  /// Força reenvio mesmo se já houver tentativa registrada.
  forcar?: boolean | undefined;
}

/**
 * Envia ordens baixadas ao ERP — paridade com `ConfirmarOrdensBaixadasCliente`
 * (note o legado "BaixarOrdensProducao" nomeia diferente de "ConfirmarOrdensBaixadasCliente").
 * Aqui na nova versão separamos as duas etapas:
 *   1. `BaixarOrdensErpUseCase` — envia as ordens ao ERP
 *   2. A confirmação (`dataIntegracao`preenchida) é responsabilidade do
 *      `GerenciarConcluirOrdensErpWorker` que lê retorno do ERP.
 */
export class BaixarOrdensErpUseCase {
  constructor(
    private readonly cliente: ClienteSoapErp,
    /** Porta de leitura das ordens do módulo manufatura — fronteira protegida. */
    private readonly ordensSource: {
      lerParaBaixar(ids: ReadonlyArray<string>): Promise<ReadonlyArray<{
        codigo: string;
        identificador: string;
        status: string;
      }>>;
      marcarIntegrada(idOrdemProducao: string, agora: Date): Promise<void>;
    },
  ) {}

  async executar(input: EntradaBaixarOrdensErp): Promise<{ enviadas: number; erros: string[] }> {
    const ordens = await this.ordensSource.lerParaBaixar(input.idsOrdensProducao);
    const erros: string[] = [];
    let enviadas = 0;
    for (const ordem of ordens) {
      const resultado: ResultadoSoap = await this.cliente.invocar('BaixarOrdensProducao', {
        codigo: ordem.codigo,
        identificador: ordem.identificador,
        status: ordem.status,
      });
      if (resultado.ok) {
        await this.ordensSource.marcarIntegrada(ordem.codigo, new Date());
        enviadas++;
      } else {
        erros.push(`${ordem.codigo}/${ordem.identificador}: ${resultado.mensagemErro ?? 'erro desconhecido'}`);
      }
    }
    return { enviadas, erros };
  }
}

/**
 * Envia etiquetas baixadas ao ERP — paridade com `ConfirmarEtiquetasManufaturaBaixadasCliente`.
 */
export class BaixarEtiquetasErpUseCase {
  constructor(
    private readonly cliente: ClienteSoapErp,
    private readonly etiquetasSource: {
      lerDisponiveisPorOrdem(ordemProducaoId: string): Promise<ReadonlyArray<{
        idEtiqueta: string;
        codigoBarras: string;
        quantidade: number;
      }>>;
      marcarBaixada(idEtiqueta: string, agora: Date): Promise<void>;
    },
  ) {}

  async executar(input: { ordemProducaoId: string }): Promise<{ enviadas: number; erros: string[] }> {
    const etiquetas = await this.etiquetasSource.lerDisponiveisPorOrdem(input.ordemProducaoId);
    const erros: string[] = [];
    let enviadas = 0;
    for (const e of etiquetas) {
      const resultado = await this.cliente.invocar('BaixarEtiquetasManufatura', {
        codigoBarras: e.codigoBarras,
        quantidade: e.quantidade,
      });
      if (resultado.ok) {
        await this.etiquetasSource.marcarBaixada(e.idEtiqueta, new Date());
        enviadas++;
      } else {
        erros.push(`${e.codigoBarras}: ${resultado.mensagemErro ?? 'erro desconhecido'}`);
      }
    }
    return { enviadas, erros };
  }
}

/**
 * Retorna os movimentos manufaturados para o ERP — paridade com a integração
 * `IntegrarMovimentos` que envia reportes/paradas ao ERP do cliente.
 */
export class IntegrarMovimentosErpUseCase {
  constructor(
    private readonly cliente: ClienteSoapErp,
    private readonly movimentosSource: {
      lerNaoIntegrados(estabelecimentoId: string): Promise<ReadonlyArray<{
        idMovimento: string;
        tipo: string;
        inicio: Date;
        quantidade: number;
      }>>;
      marcarIntegrado(idMovimento: string, agora: Date): Promise<void>;
    },
  ) {}

  async executar(input: { estabelecimentoId: string }): Promise<{ enviados: number; erros: string[] }> {
    const movimentos = await this.movimentosSource.lerNaoIntegrados(input.estabelecimentoId);
    const erros: string[] = [];
    let enviados = 0;
    for (const m of movimentos) {
      const resultado = await this.cliente.invocar('IntegrarMovimentosManufatura', {
        id: m.idMovimento,
        tipo: m.tipo,
        inicio: m.inicio.toISOString(),
        quantidade: m.quantidade,
      });
      if (resultado.ok) {
        await this.movimentosSource.marcarIntegrado(m.idMovimento, new Date());
        enviados++;
      } else {
        erros.push(`${m.idMovimento}: ${resultado.mensagemErro ?? 'erro desconhecido'}`);
      }
    }
    return { enviados, erros };
  }
}