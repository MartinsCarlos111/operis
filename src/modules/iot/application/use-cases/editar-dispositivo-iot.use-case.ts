import { EntradaIot, type ContextoIot, type FuncaoIot, type TipoEntradaIot } from '../../domain/entities/entrada-iot.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { ConsultorConexoesBroker } from '../../domain/gateways/consultor-conexoes-broker.js';
import type { PublicadorConfiguracaoIot } from '../../domain/gateways/publicador-configuracao-iot.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';
import { paraDispositivoIotDTO, type DispositivoIotDTO } from '../dtos/dispositivo-iot.dto.js';

export interface EntradaIotInput {
  id?: string | undefined;
  input: number;
  label: string;
  tipo: TipoEntradaIot;
  contexto: ContextoIot;
  funcao: FuncaoIot;
  param1?: number | null | undefined;
  param2?: number | null | undefined;
  param3?: number | null | undefined;
  param4?: number | null | undefined;
  analogicaComoDigital?: boolean | undefined;
  habilitado?: boolean | undefined;
}

export interface EditarDispositivoIotInput {
  id: string;
  /** Tenant corrente — necessário para achar o broker no Control Plane. */
  tenantId: string;
  estabelecimentoId: string;
  nome: string;
  modelo?: number | undefined;
  ip?: string | null | undefined;
  centroTrabalhoId?: string | null | undefined;
  /** Quando presente, substitui o conjunto inteiro de entradas. */
  entradas?: EntradaIotInput[] | undefined;
}

/**
 * Edita o coletor e, opcionalmente, reescreve suas entradas. O serial NÃO é
 * editável: é a identidade do aparelho no broker, e trocá-lo transformaria o
 * registro em outro dispositivo.
 *
 * Paridade com `ConfigIOTController.SaveConfigIOT`: quando `entradas` é
 * fornecido, a config nova é publicada ao dispositivo físico via broker
 * (`publicador`), além de persistida — o firmware só aplica o comportamento
 * novo nos pinos depois de receber essa mensagem.
 */
export class EditarDispositivoIotUseCase {
  constructor(
    private readonly dispositivos: DispositivoIotRepository,
    private readonly broker: ConsultorConexoesBroker,
    private readonly ids: GeradorId,
    private readonly publicador?: PublicadorConfiguracaoIot | undefined,
  ) {}

  async executar(input: EditarDispositivoIotInput): Promise<DispositivoIotDTO> {
    const dispositivo = await this.dispositivos.buscarPorId(input.id, input.estabelecimentoId);
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(input.id);
    }

    dispositivo.alterar({
      nome: input.nome,
      modelo: input.modelo,
      ip: input.ip,
      centroTrabalhoId: input.centroTrabalhoId,
    });

    if (input.entradas) {
      dispositivo.definirEntradas(
        input.entradas.map((e) =>
          EntradaIot.criar({
            idEntradaIot: e.id ?? this.ids.gerar(),
            dispositivoId: dispositivo.idDispositivoIot,
            input: e.input,
            label: e.label,
            tipo: e.tipo,
            contexto: e.contexto,
            funcao: e.funcao,
            param1: e.param1,
            param2: e.param2,
            param3: e.param3,
            param4: e.param4,
            analogicaComoDigital: e.analogicaComoDigital,
            habilitado: e.habilitado,
          }),
        ),
      );
    }

    await this.dispositivos.salvar(dispositivo);

    if (input.entradas && this.publicador) {
      // Best-effort — o publicador não lança; coletor offline não bloqueia o salvar.
      await this.publicador.publicarConfiguracao(
        input.tenantId,
        dispositivo.routingKey,
        dispositivo.entradas,
      );
    }

    const conectados = await this.broker.seriaisConectados(input.tenantId);
    return paraDispositivoIotDTO(dispositivo, conectados.has(dispositivo.serial));
  }
}
