CREATE TABLE "artigos" (
  "id_artigo" UUID NOT NULL,
  "codigo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "qualidades" TEXT,
  "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
  "estabelecimento_id" UUID NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artigos_pkey" PRIMARY KEY ("id_artigo")
);

CREATE TABLE "artigos_centros_trabalho" (
  "id_artigo_centro_trabalho" UUID NOT NULL,
  "artigo_id" UUID NOT NULL,
  "centro_trabalho_id" UUID NOT NULL,
  "ciclo_produtivo_hora" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ciclo_produtivo_peca_segundos" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tempo_preparacao_segundos" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fator_refugo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantidade_refugo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantidade_perda" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "apontar_preparacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tempo_maquina_segundos" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lote_multiplo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artigos_centros_trabalho_pkey" PRIMARY KEY ("id_artigo_centro_trabalho")
);

CREATE UNIQUE INDEX "artigos_estabelecimento_id_codigo_key" ON "artigos"("estabelecimento_id", "codigo");
CREATE UNIQUE INDEX "artigos_centros_trabalho_artigo_id_centro_trabalho_id_key" ON "artigos_centros_trabalho"("artigo_id", "centro_trabalho_id");
CREATE INDEX "artigos_estabelecimento_id_status_idx" ON "artigos"("estabelecimento_id", "status");
CREATE INDEX "artigos_centros_trabalho_centro_trabalho_id_ativo_idx" ON "artigos_centros_trabalho"("centro_trabalho_id", "ativo");

ALTER TABLE "artigos" ADD CONSTRAINT "artigos_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artigos_centros_trabalho" ADD CONSTRAINT "artigos_centros_trabalho_artigo_id_fkey" FOREIGN KEY ("artigo_id") REFERENCES "artigos"("id_artigo") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artigos_centros_trabalho" ADD CONSTRAINT "artigos_centros_trabalho_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;
