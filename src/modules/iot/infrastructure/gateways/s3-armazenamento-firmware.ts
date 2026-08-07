import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ArmazenamentoFirmwareIot } from '../../domain/gateways/armazenamento-firmware-iot.js';

/** Credenciais de acesso ao object storage do tenant, resolvidas por requisição. */
export interface AcessoObjectStorage {
  host: string;
  porta: number;
  bucket: string;
  accessKey: string;
  secretKey: string;
  sslHabilitado: boolean;
  pathStyleAccess: boolean;
}

/**
 * Resolve o acesso ao object storage de um tenant. Injetado de fora (pelo
 * composition root) porque a config vive no Control Plane — o módulo iot não
 * pode depender daquele módulo, a fronteira é verificada pelo dependency-cruiser.
 * Retorna null quando o tenant não tem MinIO configurado.
 */
export type ResolvedorAcessoObjectStorage = (
  tenantId: string,
) => Promise<AcessoObjectStorage | null>;

/**
 * Adaptador S3-compatível (MinIO) do armazenamento de firmware. Um `S3Client`
 * novo por chamada — publicar/baixar firmware é raro (não é hot path como o
 * consumo AMQP), então não vale manter cliente de longa duração em cache.
 */
export class S3ArmazenamentoFirmware implements ArmazenamentoFirmwareIot {
  constructor(private readonly resolverAcesso: ResolvedorAcessoObjectStorage) {}

  async enviar(tenantId: string, chaveObjeto: string, conteudo: Buffer): Promise<void> {
    const { cliente, bucket } = await this.montarCliente(tenantId);
    await cliente.send(
      new PutObjectCommand({ Bucket: bucket, Key: chaveObjeto, Body: conteudo }),
    );
  }

  async baixar(tenantId: string, chaveObjeto: string): Promise<Buffer> {
    const { cliente, bucket } = await this.montarCliente(tenantId);
    const resposta = await cliente.send(
      new GetObjectCommand({ Bucket: bucket, Key: chaveObjeto }),
    );
    if (!resposta.Body) {
      throw new Error(`Objeto '${chaveObjeto}' sem conteúdo no bucket.`);
    }
    const bytes = await resposta.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  private async montarCliente(
    tenantId: string,
  ): Promise<{ cliente: S3Client; bucket: string }> {
    const acesso = await this.resolverAcesso(tenantId);
    if (!acesso) {
      throw new Error(`Tenant '${tenantId}' sem object storage (MinIO) configurado.`);
    }
    const protocolo = acesso.sslHabilitado ? 'https' : 'http';
    const cliente = new S3Client({
      endpoint: `${protocolo}://${acesso.host}:${acesso.porta}`,
      region: 'us-east-1',
      forcePathStyle: acesso.pathStyleAccess,
      credentials: { accessKeyId: acesso.accessKey, secretAccessKey: acesso.secretKey },
    });
    return { cliente, bucket: acesso.bucket };
  }
}
