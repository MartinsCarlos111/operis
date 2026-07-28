-- CreateTable
CREATE TABLE "areas" (
    "idArea" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("idArea")
);

-- CreateIndex
CREATE INDEX "areas_estabelecimento_id_idx" ON "areas"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_estabelecimento_id_codigo_key" ON "areas"("estabelecimento_id", "codigo");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;
