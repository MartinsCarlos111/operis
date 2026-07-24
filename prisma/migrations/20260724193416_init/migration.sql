-- CreateEnum
CREATE TYPE "StatusRecurso" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusConexao" AS ENUM ('PROVISIONANDO', 'ONLINE', 'OFFLINE', 'ERRO');

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "idEstabelecimento" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "impressoras" "StatusRecurso" NOT NULL DEFAULT 'INATIVO',
    "coletores" "StatusRecurso" NOT NULL DEFAULT 'INATIVO',
    "checklist" "StatusRecurso" NOT NULL DEFAULT 'INATIVO',
    "manufatura" "StatusRecurso" NOT NULL DEFAULT 'INATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("idEstabelecimento")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "idPermissao" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("idPermissao")
);

-- CreateTable
CREATE TABLE "niveis_acesso" (
    "idNivelAcesso" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niveis_acesso_pkey" PRIMARY KEY ("idNivelAcesso")
);

-- CreateTable
CREATE TABLE "niveis_acesso_permissoes" (
    "nivel_acesso_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,

    CONSTRAINT "niveis_acesso_permissoes_pkey" PRIMARY KEY ("nivel_acesso_id","permissao_id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "idUsuario" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "biometria" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "politicas_login" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("idUsuario")
);

-- CreateTable
CREATE TABLE "usuarios_estabelecimentos" (
    "usuario_id" UUID NOT NULL,
    "estabelecimento_id" UUID NOT NULL,
    "nivel_acesso_id" UUID NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_estabelecimentos_pkey" PRIMARY KEY ("usuario_id","estabelecimento_id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "idTenant" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("idTenant")
);

-- CreateTable
CREATE TABLE "tenants_databases" (
    "idTenantDatabase" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "database_provider" TEXT NOT NULL DEFAULT 'postgresql',
    "database_host" TEXT NOT NULL,
    "database_port" INTEGER NOT NULL,
    "database_name" TEXT NOT NULL,
    "database_username" TEXT NOT NULL,
    "database_password_encrypted" TEXT NOT NULL,
    "database_encryption_version" INTEGER NOT NULL DEFAULT 1,
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "connection_status" "StatusConexao" NOT NULL DEFAULT 'PROVISIONANDO',
    "last_connection_at" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_databases_pkey" PRIMARY KEY ("idTenantDatabase")
);

-- CreateTable
CREATE TABLE "tenants_administradores" (
    "idTenantAdministrador" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "tenant_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_administradores_pkey" PRIMARY KEY ("idTenantAdministrador")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "idSuperAdmin" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("idSuperAdmin")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_chave_key" ON "permissoes"("chave");

-- CreateIndex
CREATE INDEX "permissoes_grupo_idx" ON "permissoes"("grupo");

-- CreateIndex
CREATE INDEX "niveis_acesso_estabelecimento_id_idx" ON "niveis_acesso"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "niveis_acesso_estabelecimento_id_nome_key" ON "niveis_acesso"("estabelecimento_id", "nome");

-- CreateIndex
CREATE INDEX "niveis_acesso_permissoes_permissao_id_idx" ON "niveis_acesso_permissoes"("permissao_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_estabelecimentos_estabelecimento_id_idx" ON "usuarios_estabelecimentos"("estabelecimento_id");

-- CreateIndex
CREATE INDEX "usuarios_estabelecimentos_nivel_acesso_id_idx" ON "usuarios_estabelecimentos"("nivel_acesso_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_databases_tenant_id_key" ON "tenants_databases"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_administradores_email_key" ON "tenants_administradores"("email");

-- CreateIndex
CREATE INDEX "tenants_administradores_tenant_id_idx" ON "tenants_administradores"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- AddForeignKey
ALTER TABLE "niveis_acesso" ADD CONSTRAINT "niveis_acesso_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveis_acesso_permissoes" ADD CONSTRAINT "niveis_acesso_permissoes_nivel_acesso_id_fkey" FOREIGN KEY ("nivel_acesso_id") REFERENCES "niveis_acesso"("idNivelAcesso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveis_acesso_permissoes" ADD CONSTRAINT "niveis_acesso_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("idPermissao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_estabelecimentos" ADD CONSTRAINT "usuarios_estabelecimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idUsuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_estabelecimentos" ADD CONSTRAINT "usuarios_estabelecimentos_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_estabelecimentos" ADD CONSTRAINT "usuarios_estabelecimentos_nivel_acesso_id_fkey" FOREIGN KEY ("nivel_acesso_id") REFERENCES "niveis_acesso"("idNivelAcesso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants_databases" ADD CONSTRAINT "tenants_databases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("idTenant") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants_administradores" ADD CONSTRAINT "tenants_administradores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("idTenant") ON DELETE CASCADE ON UPDATE CASCADE;
