-- CreateTable
CREATE TABLE "itens" (
    "idItem" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_pkey" PRIMARY KEY ("idItem")
);

-- CreateTable
CREATE TABLE "itens_qualidades_item" (
    "item_id" UUID NOT NULL,
    "qualidade_item_id" UUID NOT NULL,

    CONSTRAINT "itens_qualidades_item_pkey" PRIMARY KEY ("item_id","qualidade_item_id")
);

-- CreateIndex
CREATE INDEX "itens_estabelecimento_id_idx" ON "itens"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "itens_estabelecimento_id_codigo_key" ON "itens"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "itens_qualidades_item_qualidade_item_id_idx" ON "itens_qualidades_item"("qualidade_item_id");

-- AddForeignKey
ALTER TABLE "itens" ADD CONSTRAINT "itens_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_qualidades_item" ADD CONSTRAINT "itens_qualidades_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("idItem") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_qualidades_item" ADD CONSTRAINT "itens_qualidades_item_qualidade_item_id_fkey" FOREIGN KEY ("qualidade_item_id") REFERENCES "qualidades_item"("idQualidadeItem") ON DELETE CASCADE ON UPDATE CASCADE;
