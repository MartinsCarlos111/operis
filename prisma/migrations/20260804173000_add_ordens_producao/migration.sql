-- Ordens de producao e planos: identidade e estados portados do legado.
CREATE TYPE "StatusOrdemProducao" AS ENUM ('LIBERADA', 'NAO_LIBERADA', 'INICIADA', 'CONGELADA', 'RECUSADA', 'CONCLUIDA', 'CANCELADA', 'BAIXADA');
CREATE TYPE "OrigemOrdemProducao" AS ENUM ('OCTOPUS', 'ERP', 'TERMINAL', 'PLANO');
CREATE TYPE "ModoDistribuicaoOrdem" AS ENUM ('PUXADA', 'EMPURRADA');

CREATE TABLE "planos_producao" (
  "idPlanoProducao" UUID NOT NULL,
  "codigo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "itemCodigo" TEXT NOT NULL,
  "itemDescricao" TEXT,
  "quantidade" DOUBLE PRECISION NOT NULL,
  "unidade_medida" "TipoUnidadeMedida" NOT NULL DEFAULT 'UNIDADE',
  "inicio_planejado" TIMESTAMP(3),
  "fim_planejado" TIMESTAMP(3),
  "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
  "estabelecimento_id" UUID NOT NULL,
  "centro_trabalho_id" UUID,
  "grupo_maquina_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "planos_producao_pkey" PRIMARY KEY ("idPlanoProducao")
);

CREATE TABLE "ordens_producao" (
  "id_ordem_producao" UUID NOT NULL,
  "codigo" TEXT NOT NULL,
  "identificador" TEXT NOT NULL,
  "item_codigo" TEXT NOT NULL,
  "item_descricao" TEXT,
  "quantidade_planejada" DOUBLE PRECISION NOT NULL,
  "quantidade_produzida" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantidade_refugo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unidade_medida" "TipoUnidadeMedida" NOT NULL DEFAULT 'UNIDADE',
  "status" "StatusOrdemProducao" NOT NULL DEFAULT 'LIBERADA',
  "origem" "OrigemOrdemProducao" NOT NULL DEFAULT 'OCTOPUS',
  "modo_distribuicao" "ModoDistribuicaoOrdem" NOT NULL DEFAULT 'PUXADA',
  "prioridade" INTEGER NOT NULL DEFAULT 999999,
  "prioridade_codigo_redutor" INTEGER NOT NULL DEFAULT 999999,
  "sequencia" INTEGER NOT NULL DEFAULT 999999,
  "centro_trabalho_valido" TEXT,
  "cliente" TEXT,
  "pedido" TEXT,
  "observacoes" TEXT,
  "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "liberacao_em" TIMESTAMP(3),
  "inicio_planejado" TIMESTAMP(3),
  "fim_planejado" TIMESTAMP(3),
  "encerra_em" TIMESTAMP(3),
  "estabelecimento_id" UUID NOT NULL,
  "centro_trabalho_id" UUID,
  "grupo_maquina_id" UUID,
  "plano_producao_id" UUID,
  "ordem_pai_id" UUID,
  "ordem_sequencia_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ordens_producao_pkey" PRIMARY KEY ("id_ordem_producao")
);

CREATE UNIQUE INDEX "planos_producao_estabelecimento_id_codigo_key" ON "planos_producao"("estabelecimento_id", "codigo");
CREATE UNIQUE INDEX "ordens_producao_codigo_identificador_key" ON "ordens_producao"("codigo", "identificador");
CREATE INDEX "planos_producao_estabelecimento_id_status_idx" ON "planos_producao"("estabelecimento_id", "status");
CREATE INDEX "ordens_producao_estabelecimento_id_status_idx" ON "ordens_producao"("estabelecimento_id", "status");
CREATE INDEX "ordens_producao_estabelecimento_id_inicio_planejado_idx" ON "ordens_producao"("estabelecimento_id", "inicio_planejado");

ALTER TABLE "planos_producao" ADD CONSTRAINT "planos_producao_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planos_producao" ADD CONSTRAINT "planos_producao_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planos_producao" ADD CONSTRAINT "planos_producao_grupo_maquina_id_fkey" FOREIGN KEY ("grupo_maquina_id") REFERENCES "grupos_maquina"("idGrupoMaquina") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_grupo_maquina_id_fkey" FOREIGN KEY ("grupo_maquina_id") REFERENCES "grupos_maquina"("idGrupoMaquina") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_plano_producao_id_fkey" FOREIGN KEY ("plano_producao_id") REFERENCES "planos_producao"("idPlanoProducao") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_ordem_pai_id_fkey" FOREIGN KEY ("ordem_pai_id") REFERENCES "ordens_producao"("id_ordem_producao") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_ordem_sequencia_id_fkey" FOREIGN KEY ("ordem_sequencia_id") REFERENCES "ordens_producao"("id_ordem_producao") ON DELETE SET NULL ON UPDATE CASCADE;
