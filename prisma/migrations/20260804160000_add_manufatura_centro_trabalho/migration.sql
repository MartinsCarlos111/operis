-- CreateEnum
CREATE TYPE "TratamentoTempo" AS ENUM ('FIXO', 'PROPORCIONAL', 'FERRAMENTAL', 'LOTE');

-- CreateEnum
CREATE TYPE "TipoUnidadeMedida" AS ENUM ('UNIDADE', 'METRAGEM', 'PESO', 'AREA', 'VOLUME', 'ESPECIFICA');

-- CreateEnum
CREATE TYPE "CriticidadeParada" AS ENUM ('PLANEJADA', 'BAIXA', 'NORMAL', 'ALTA', 'CRITICA', 'IMPEDITIVA');

-- CreateEnum
CREATE TYPE "RegraDespacho" AS ENUM ('MENOR_OPERACAO', 'DATA_ENTREGA', 'PRIORIDADE', 'CODIGO_REDUTOR');

-- CreateEnum
CREATE TYPE "TipoCausaClassificacao" AS ENUM ('MANUTENCAO', 'PARADA');

-- CreateEnum
CREATE TYPE "TipoParadaClassificacao" AS ENUM ('CONTROLA_MANUTENCAO', 'INFORMA_CAUSA');

-- CreateEnum
CREATE TYPE "OrigemRecusa" AS ENUM ('PRODUCAO', 'MANUTENCAO', 'QUALIDADE', 'IMPRESSAO');

-- CreateTable
CREATE TABLE "calendarios" (
    "idCalendario" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendarios_pkey" PRIMARY KEY ("idCalendario")
);

-- CreateTable
CREATE TABLE "grupos_maquina" (
    "idGrupoMaquina" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "regra_despacho" "RegraDespacho" NOT NULL DEFAULT 'DATA_ENTREGA',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_maquina_pkey" PRIMARY KEY ("idGrupoMaquina")
);

-- CreateTable
CREATE TABLE "tipos_causa" (
    "idTipoCausa" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "descricao_detalhada" TEXT,
    "criticidade" "CriticidadeParada" NOT NULL DEFAULT 'NORMAL',
    "classificacao" "TipoCausaClassificacao",
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_causa_pkey" PRIMARY KEY ("idTipoCausa")
);

-- CreateTable
CREATE TABLE "tipos_parada" (
    "idTipoParada" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "considera_oee" BOOLEAN NOT NULL DEFAULT true,
    "classificacao" "TipoParadaClassificacao",
    "parada_padrao_minutos" INTEGER,
    "utiliza_parada_padrao" BOOLEAN NOT NULL DEFAULT false,
    "criticidade" "CriticidadeParada" NOT NULL DEFAULT 'NORMAL',
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_parada_pkey" PRIMARY KEY ("idTipoParada")
);

-- CreateTable
CREATE TABLE "tipos_recusa" (
    "idTipoRecusa" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "origem" "OrigemRecusa" NOT NULL DEFAULT 'PRODUCAO',
    "criticidade" "CriticidadeParada" NOT NULL DEFAULT 'NORMAL',
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_recusa_pkey" PRIMARY KEY ("idTipoRecusa")
);

-- CreateTable
CREATE TABLE "tipos_refugo" (
    "idTipoRefugo" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "considera_oee" BOOLEAN NOT NULL DEFAULT true,
    "possivel_retrabalho" BOOLEAN NOT NULL DEFAULT false,
    "criticidade" "CriticidadeParada" NOT NULL DEFAULT 'NORMAL',
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_refugo_pkey" PRIMARY KEY ("idTipoRefugo")
);

-- CreateTable
CREATE TABLE "centros_trabalho" (
    "idCentroTrabalho" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "calendario_id" UUID NOT NULL,
    "grupo_maquina_id" UUID,
    "tipo_causa_id" UUID,
    "tipo_parada_id" UUID,
    "tipo_recusa_id" UUID,
    "tipo_refugo_id" UUID,
    "controla_mao_obra" BOOLEAN NOT NULL DEFAULT false,
    "preparacao" BOOLEAN NOT NULL DEFAULT false,
    "operacao_baixada" INTEGER,
    "tempo_parada_padrao_minutos" INTEGER NOT NULL DEFAULT 0,
    "tratamento_tempo" "TratamentoTempo" NOT NULL DEFAULT 'FIXO',
    "tratamento_tempo_lote" DECIMAL(18,4),
    "tipo_unidade_medida" "TipoUnidadeMedida" NOT NULL DEFAULT 'UNIDADE',
    "meta_disp_turno" DECIMAL(5,2),
    "meta_desemp_turno" DECIMAL(5,2),
    "meta_quali_turno" DECIMAL(5,2),
    "meta_oee_turno" DECIMAL(5,2),
    "custo_maquina_hora" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_trabalho_pkey" PRIMARY KEY ("idCentroTrabalho")
);

-- CreateIndex
CREATE INDEX "calendarios_estabelecimento_id_idx" ON "calendarios"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendarios_estabelecimento_id_codigo_key" ON "calendarios"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "grupos_maquina_estabelecimento_id_idx" ON "grupos_maquina"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_maquina_estabelecimento_id_codigo_key" ON "grupos_maquina"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "tipos_causa_estabelecimento_id_idx" ON "tipos_causa"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_causa_estabelecimento_id_codigo_key" ON "tipos_causa"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "tipos_parada_estabelecimento_id_idx" ON "tipos_parada"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_parada_estabelecimento_id_codigo_key" ON "tipos_parada"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "tipos_recusa_estabelecimento_id_idx" ON "tipos_recusa"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_recusa_estabelecimento_id_codigo_key" ON "tipos_recusa"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "tipos_refugo_estabelecimento_id_idx" ON "tipos_refugo"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_refugo_estabelecimento_id_codigo_key" ON "tipos_refugo"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "centros_trabalho_estabelecimento_id_idx" ON "centros_trabalho"("estabelecimento_id");

-- CreateIndex
CREATE INDEX "centros_trabalho_calendario_id_idx" ON "centros_trabalho"("calendario_id");

-- CreateIndex
CREATE INDEX "centros_trabalho_grupo_maquina_id_idx" ON "centros_trabalho"("grupo_maquina_id");

-- CreateIndex
CREATE UNIQUE INDEX "centros_trabalho_estabelecimento_id_codigo_key" ON "centros_trabalho"("estabelecimento_id", "codigo");

-- AddForeignKey
ALTER TABLE "calendarios" ADD CONSTRAINT "calendarios_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_maquina" ADD CONSTRAINT "grupos_maquina_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_causa" ADD CONSTRAINT "tipos_causa_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_parada" ADD CONSTRAINT "tipos_parada_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_recusa" ADD CONSTRAINT "tipos_recusa_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_refugo" ADD CONSTRAINT "tipos_refugo_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_calendario_id_fkey" FOREIGN KEY ("calendario_id") REFERENCES "calendarios"("idCalendario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_grupo_maquina_id_fkey" FOREIGN KEY ("grupo_maquina_id") REFERENCES "grupos_maquina"("idGrupoMaquina") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_tipo_causa_id_fkey" FOREIGN KEY ("tipo_causa_id") REFERENCES "tipos_causa"("idTipoCausa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_tipo_parada_id_fkey" FOREIGN KEY ("tipo_parada_id") REFERENCES "tipos_parada"("idTipoParada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_tipo_recusa_id_fkey" FOREIGN KEY ("tipo_recusa_id") REFERENCES "tipos_recusa"("idTipoRecusa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_tipo_refugo_id_fkey" FOREIGN KEY ("tipo_refugo_id") REFERENCES "tipos_refugo"("idTipoRefugo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho" ADD CONSTRAINT "centros_trabalho_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

