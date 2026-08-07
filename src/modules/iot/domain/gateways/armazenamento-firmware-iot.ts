/**
 * Porta anticorrupção para o object storage (MinIO/S3) onde os binários de
 * firmware ficam. Cada tenant tem seu próprio bucket/credenciais (Control
 * Plane) — o módulo iot não sabe de onde vêm, só fala com esta interface.
 */
export interface ArmazenamentoFirmwareIot {
  /** Envia o binário e devolve a key (chaveObjeto) no bucket do tenant. */
  enviar(tenantId: string, chaveObjeto: string, conteudo: Buffer): Promise<void>;
  /** Lê o binário de volta — usado pela rota pública de download. */
  baixar(tenantId: string, chaveObjeto: string): Promise<Buffer>;
}
