-- CreateTable
CREATE TABLE "impressoras" (
    "idImpressora" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impressoras_pkey" PRIMARY KEY ("idImpressora")
);

-- CreateIndex
CREATE UNIQUE INDEX "impressoras_codigo_key" ON "impressoras"("codigo");
