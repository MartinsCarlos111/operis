-- CreateTable
CREATE TABLE "tenants_rabbitmq" (
    "idTenantRabbitMq" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL,
    "virtual_host" TEXT NOT NULL DEFAULT '/',
    "usuario" TEXT NOT NULL,
    "senha_encrypted" TEXT NOT NULL,
    "encryption_version" INTEGER NOT NULL DEFAULT 1,
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_rabbitmq_pkey" PRIMARY KEY ("idTenantRabbitMq")
);

-- CreateTable
CREATE TABLE "tenants_smtp" (
    "idTenantSmtp" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL,
    "usuario" TEXT NOT NULL,
    "remetente" TEXT NOT NULL DEFAULT '',
    "senha_encrypted" TEXT NOT NULL,
    "encryption_version" INTEGER NOT NULL DEFAULT 1,
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_smtp_pkey" PRIMARY KEY ("idTenantSmtp")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_rabbitmq_tenant_id_key" ON "tenants_rabbitmq"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_smtp_tenant_id_key" ON "tenants_smtp"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenants_rabbitmq" ADD CONSTRAINT "tenants_rabbitmq_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("idTenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants_smtp" ADD CONSTRAINT "tenants_smtp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("idTenant") ON DELETE CASCADE ON UPDATE CASCADE;
