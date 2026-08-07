/**
 * Porta anticorrupção para publicar o disparo de atualização OTA ao coletor
 * físico. Paridade com `CentroTrabalhoIOTController.UpdateFirmware`: publica
 * `{ type: UPDATE, data: { firmware_url } }` na routing key do dispositivo.
 */
export interface PublicadorAtualizacaoFirmwareIot {
  /**
   * `firmwareUrl` é a URL pública (sem autenticação) de onde o coletor baixa
   * o binário via HTTP GET — o firmware concatena `?serialIot=<serial>` nela
   * sozinho, não é responsabilidade deste gateway.
   */
  publicarAtualizacao(tenantId: string, routingKey: string, firmwareUrl: string): Promise<void>;
}
