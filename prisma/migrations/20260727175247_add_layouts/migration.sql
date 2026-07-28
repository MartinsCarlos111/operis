-- CreateTable
CREATE TABLE "variaveis_layout" (
    "idVariavel" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "campo_etiqueta_manufatura" TEXT NOT NULL DEFAULT '',
    "campo_etiqueta_coletores" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variaveis_layout_pkey" PRIMARY KEY ("idVariavel")
);

-- CreateTable
CREATE TABLE "layouts_etiqueta" (
    "idLayout" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "zpl" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "layouts_etiqueta_pkey" PRIMARY KEY ("idLayout")
);

-- CreateIndex
CREATE UNIQUE INDEX "variaveis_layout_codigo_key" ON "variaveis_layout"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "layouts_etiqueta_codigo_key" ON "layouts_etiqueta"("codigo");
