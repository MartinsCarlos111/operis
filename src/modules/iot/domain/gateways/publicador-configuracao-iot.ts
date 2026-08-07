import type { EntradaIot } from '../entities/entrada-iot.js';

/**
 * Porta anticorrupção para publicar configuração de volta ao coletor físico.
 *
 * Paridade com `ConfigIOTController.SaveConfigIOT` do legado: salvar a
 * configuração de entradas não é só persistência — o firmware precisa
 * receber a mesma config via broker para aplicá-la nos pinos (mudar modo de
 * interrupção elétrica, recalcular contadores) e reiniciar.
 */
export interface PublicadorConfiguracaoIot {
  /**
   * Publica `{ type: CONFIGURATION, data: {...} }` na routing key do
   * dispositivo. Best-effort: se o broker estiver fora do ar, a configuração
   * já foi salva no banco e será reenviada na próxima edição — não deve
   * bloquear nem falhar a operação de salvar.
   */
  publicarConfiguracao(
    tenantId: string,
    routingKey: string,
    entradas: readonly EntradaIot[],
  ): Promise<void>;
}
