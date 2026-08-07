-- Configuração de object storage MinIO/S3 por tenant (Control Plane), mesmo
-- padrão de TenantRabbitMq/TenantSmtp (secret cifrado AES-256-GCM).
CREATE TABLE "tenants_minio" (
    "idTenantMinio" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "access_key" TEXT NOT NULL,
    "secret_key_encrypted" TEXT NOT NULL,
    "encryption_version" INTEGER NOT NULL DEFAULT 1,
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "path_style_access" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_minio_pkey" PRIMARY KEY ("idTenantMinio")
);

CREATE UNIQUE INDEX "tenants_minio_tenant_id_key" ON "tenants_minio"("tenant_id");

ALTER TABLE "tenants_minio" ADD CONSTRAINT "tenants_minio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("idTenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- Binário de firmware versionado (guardado no MinIO/S3 do tenant; esta tabela
-- só tem os metadados).
CREATE TABLE "firmwares_iot" (
    "id_firmware_iot" UUID NOT NULL,
    "modelo" INTEGER NOT NULL,
    "versao" TEXT NOT NULL,
    "chave_objeto" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firmwares_iot_pkey" PRIMARY KEY ("id_firmware_iot")
);

CREATE INDEX "firmwares_iot_estabelecimento_id_modelo_idx" ON "firmwares_iot"("estabelecimento_id", "modelo");
CREATE UNIQUE INDEX "firmwares_iot_estabelecimento_id_modelo_versao_key" ON "firmwares_iot"("estabelecimento_id", "modelo", "versao");

ALTER TABLE "firmwares_iot" ADD CONSTRAINT "firmwares_iot_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vincula o ciclo de atualização ao binário de firmware real solicitado.
ALTER TABLE "atualizacoes_firmware_iot" ADD COLUMN "firmware_id" UUID NOT NULL;
CREATE INDEX "atualizacoes_firmware_iot_firmware_id_idx" ON "atualizacoes_firmware_iot"("firmware_id");
ALTER TABLE "atualizacoes_firmware_iot" ADD CONSTRAINT "atualizacoes_firmware_iot_firmware_id_fkey" FOREIGN KEY ("firmware_id") REFERENCES "firmwares_iot"("id_firmware_iot") ON DELETE CASCADE ON UPDATE CASCADE;
