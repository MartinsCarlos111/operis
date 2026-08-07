-- CreateTable
CREATE TABLE "centros_trabalho_itens" (
    "idCentroTrabalhoItem" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "centro_trabalho_id" UUID NOT NULL,
    "ciclo_produtivo_hora" DECIMAL(18,2),
    "ciclo_produtivo_peca_segundos" INTEGER DEFAULT 0,
    "tempo_preparacao_segundos" INTEGER,
    "fator_refugo" DECIMAL(18,2),
    "qtd_refugo" DECIMAL(18,2),
    "qtd_perda" DECIMAL(18,2),
    "apontar_preparacao" DECIMAL(18,2),
    "tempo_maquina_segundos" INTEGER,
    "lote_multiplo" DECIMAL(18,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_trabalho_itens_pkey" PRIMARY KEY ("idCentroTrabalhoItem")
);

-- CreateIndex
CREATE INDEX "centros_trabalho_itens_centro_trabalho_id_idx" ON "centros_trabalho_itens"("centro_trabalho_id");

-- CreateIndex
CREATE UNIQUE INDEX "centros_trabalho_itens_item_id_centro_trabalho_id_key" ON "centros_trabalho_itens"("item_id", "centro_trabalho_id");

-- AddForeignKey
ALTER TABLE "centros_trabalho_itens" ADD CONSTRAINT "centros_trabalho_itens_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("idItem") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho_itens" ADD CONSTRAINT "centros_trabalho_itens_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;
