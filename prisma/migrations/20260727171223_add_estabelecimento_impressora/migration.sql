-- CreateTable
CREATE TABLE "estabelecimentos_impressoras" (
    "estabelecimento_id" UUID NOT NULL,
    "impressora_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estabelecimentos_impressoras_pkey" PRIMARY KEY ("estabelecimento_id","impressora_id")
);

-- CreateIndex
CREATE INDEX "estabelecimentos_impressoras_impressora_id_idx" ON "estabelecimentos_impressoras"("impressora_id");

-- AddForeignKey
ALTER TABLE "estabelecimentos_impressoras" ADD CONSTRAINT "estabelecimentos_impressoras_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos_impressoras" ADD CONSTRAINT "estabelecimentos_impressoras_impressora_id_fkey" FOREIGN KEY ("impressora_id") REFERENCES "impressoras"("idImpressora") ON DELETE CASCADE ON UPDATE CASCADE;
