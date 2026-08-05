-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('PREPARACAO', 'REPORTE', 'REFUGO', 'PARADA', 'TROCA_FERRAMENTAL', 'TROCA_TURNO', 'RECUSA', 'ALERTA', 'HISTORICO', 'ESTORNO', 'REQUISICAO', 'DEVOLUCAO', 'CONSUMO_LOTE');

-- CreateTable
CREATE TABLE "movimentos" (
    "idMovimento" UUID NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "centro_trabalho_id" UUID NOT NULL,
    "ordem_producao_id" UUID,
    "reserva_id" UUID,
    "usuario_id" UUID NOT NULL,
    "operador" TEXT NOT NULL,
    "turno_id" UUID NOT NULL,
    "data_turno" TIMESTAMP(3) NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "duracao_segundos" INTEGER,
    "considera_oee" BOOLEAN NOT NULL DEFAULT true,
    "quantidade_unidade" DECIMAL(18,4),
    "quantidade_metragem" DECIMAL(18,4),
    "quantidade_peso" DECIMAL(18,4),
    "quantidade_area" DECIMAL(18,4),
    "quantidade_volume" DECIMAL(18,4),
    "quantidade_especifica" DECIMAL(18,4),
    "tipo_parada_id" UUID,
    "tipo_refugo_id" UUID,
    "tipo_causa_id" UUID,
    "tipo_recusa_id" UUID,
    "tecnico_manutencao" TEXT,
    "ordem_manutencao" TEXT,
    "fim_solicitacao" TIMESTAMP(3),
    "tempo_solicitacao_segundos" INTEGER,
    "fim_manutencao" TIMESTAMP(3),
    "tempo_manutencao_segundos" INTEGER,
    "descricao_causa" TEXT,
    "reporta_erp" BOOLEAN NOT NULL DEFAULT false,
    "data_integracao" TIMESTAMP(3),
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "usuario_cancelamento_id" UUID,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentos_pkey" PRIMARY KEY ("idMovimento")
);

-- CreateIndex
CREATE INDEX "movimentos_centro_trabalho_id_tipo_inicio_idx" ON "movimentos"("centro_trabalho_id", "tipo", "inicio");

-- CreateIndex
CREATE INDEX "movimentos_ordem_producao_id_idx" ON "movimentos"("ordem_producao_id");

-- CreateIndex
CREATE INDEX "movimentos_turno_id_data_turno_idx" ON "movimentos"("turno_id", "data_turno");

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id_ordem_producao") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("idReserva") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("idTurno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_tipo_parada_id_fkey" FOREIGN KEY ("tipo_parada_id") REFERENCES "tipos_parada"("idTipoParada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_tipo_refugo_id_fkey" FOREIGN KEY ("tipo_refugo_id") REFERENCES "tipos_refugo"("idTipoRefugo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_tipo_causa_id_fkey" FOREIGN KEY ("tipo_causa_id") REFERENCES "tipos_causa"("idTipoCausa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_tipo_recusa_id_fkey" FOREIGN KEY ("tipo_recusa_id") REFERENCES "tipos_recusa"("idTipoRecusa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_usuario_cancelamento_id_fkey" FOREIGN KEY ("usuario_cancelamento_id") REFERENCES "usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

