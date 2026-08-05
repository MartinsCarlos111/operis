-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('NAO_REQUISITADA', 'REQUISITADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "reservas" (
    "idReserva" UUID NOT NULL,
    "ordem_producao_id" UUID NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "item_codigo" TEXT NOT NULL,
    "item_descricao" TEXT NOT NULL,
    "lote" TEXT,
    "unidade_medida" TEXT,
    "quantidade_reserva" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantidade_requisitada" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantidade_devolvida" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "requisicao_terminal" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusReserva" NOT NULL DEFAULT 'NAO_REQUISITADA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("idReserva")
);

-- CreateIndex
CREATE INDEX "reservas_ordem_producao_id_idx" ON "reservas"("ordem_producao_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_ordem_producao_id_item_codigo_sequencia_key" ON "reservas"("ordem_producao_id", "item_codigo", "sequencia");

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id_ordem_producao") ON DELETE CASCADE ON UPDATE CASCADE;

