-- CreateTable
CREATE TABLE "regras_notificacao" (
    "idRegraNotificacao" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "destinatarios" TEXT NOT NULL DEFAULT '',
    "produto" TEXT NOT NULL DEFAULT '',
    "tabela" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_notificacao_pkey" PRIMARY KEY ("idRegraNotificacao")
);

-- CreateTable
CREATE TABLE "condicoes_notificacao" (
    "idCondicaoNotificacao" UUID NOT NULL,
    "regra_notificacao_id" UUID NOT NULL,
    "campo" TEXT NOT NULL,
    "operador" TEXT NOT NULL,
    "valor" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condicoes_notificacao_pkey" PRIMARY KEY ("idCondicaoNotificacao")
);

-- CreateIndex
CREATE UNIQUE INDEX "regras_notificacao_codigo_key" ON "regras_notificacao"("codigo");

-- CreateIndex
CREATE INDEX "condicoes_notificacao_regra_notificacao_id_idx" ON "condicoes_notificacao"("regra_notificacao_id");

-- AddForeignKey
ALTER TABLE "condicoes_notificacao" ADD CONSTRAINT "condicoes_notificacao_regra_notificacao_id_fkey" FOREIGN KEY ("regra_notificacao_id") REFERENCES "regras_notificacao"("idRegraNotificacao") ON DELETE CASCADE ON UPDATE CASCADE;
