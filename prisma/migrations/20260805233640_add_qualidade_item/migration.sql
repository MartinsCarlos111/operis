-- CreateEnum
CREATE TYPE "StatusAtualizacaoFirmware" AS ENUM ('SOLICITADA', 'INICIADA', 'CONCLUIDA', 'FALHOU');

-- CreateEnum
CREATE TYPE "StatusEtiqueta" AS ENUM ('DISPONIVEL', 'UTILIZADA', 'CANCELADA', 'BAIXADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "MotivoGeracaoEtiqueta" AS ENUM ('REPORTE', 'REIMPRESSAO', 'CANCELAMENTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusCentroTrabalhoOnline" AS ENUM ('PRODUZINDO', 'PARADA', 'EM_SETUP', 'MANUTENCAO_SOLICITADA', 'MANUTENCAO_EM_ATENDIMENTO', 'OCIOSA', 'DESCONECTADA', 'BAIXO_DESEMPENHO');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('PENDENTE_ENVIO', 'ENVIADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "qualidades_item" (
    "idQualidadeItem" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualidades_item_pkey" PRIMARY KEY ("idQualidadeItem")
);

-- CreateTable
CREATE TABLE "atualizacoes_firmware_iot" (
    "id_atualizacao_firmware" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "versao_target" TEXT NOT NULL,
    "status" "StatusAtualizacaoFirmware" NOT NULL DEFAULT 'SOLICITADA',
    "solicitado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),
    "mensagem_erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atualizacoes_firmware_iot_pkey" PRIMARY KEY ("id_atualizacao_firmware")
);

-- CreateTable
CREATE TABLE "ferramentas" (
    "id_ferramenta" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "vida_util_unidade" DECIMAL(18,4),
    "vida_util_segundos" INTEGER,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ferramentas_pkey" PRIMARY KEY ("id_ferramenta")
);

-- CreateTable
CREATE TABLE "centros_trabalho_ferramenta" (
    "id_centro_trabalho_ferramenta" UUID NOT NULL,
    "centro_trabalho_id" UUID NOT NULL,
    "ferramenta_id" UUID NOT NULL,
    "tempo_troca_segundos" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_trabalho_ferramenta_pkey" PRIMARY KEY ("id_centro_trabalho_ferramenta")
);

-- CreateTable
CREATE TABLE "movimentos_ferramenta" (
    "id_movimento_ferramenta" UUID NOT NULL,
    "ferramenta_id" UUID NOT NULL,
    "movimento_id" UUID NOT NULL,
    "quantidade_produzida" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tempo_maquina_segundos" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_ferramenta_pkey" PRIMARY KEY ("id_movimento_ferramenta")
);

-- CreateTable
CREATE TABLE "consumos_ferramenta" (
    "id_consumo_ferramenta" UUID NOT NULL,
    "ferramenta_id" UUID NOT NULL,
    "centro_trabalho_id" UUID NOT NULL,
    "turno_id" UUID NOT NULL,
    "data_turno" TIMESTAMP(3) NOT NULL,
    "quantidade_produzida" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tempo_maquina_segundos" INTEGER NOT NULL DEFAULT 0,
    "vida_util_restante_unidade" DECIMAL(18,4),
    "vida_util_restante_segundos" INTEGER,
    "recalcular" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumos_ferramenta_pkey" PRIMARY KEY ("id_consumo_ferramenta")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id_etiqueta" UUID NOT NULL,
    "codigo_barras" TEXT NOT NULL,
    "sequencial" INTEGER NOT NULL,
    "motivo_geracao" "MotivoGeracaoEtiqueta" NOT NULL DEFAULT 'REPORTE',
    "status" "StatusEtiqueta" NOT NULL DEFAULT 'DISPONIVEL',
    "quantidade" DECIMAL(18,4) NOT NULL,
    "unidade_medida" "TipoUnidadeMedida" NOT NULL DEFAULT 'UNIDADE',
    "ordem_producao_id" UUID NOT NULL,
    "movimento_id" UUID,
    "layout_id" UUID,
    "impresso_em" TIMESTAMP(3),
    "baixado_em" TIMESTAMP(3),
    "usuario_id" UUID NOT NULL,
    "observacao" TEXT,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id_etiqueta")
);

-- CreateTable
CREATE TABLE "rastreabilidades" (
    "id_rastreabilidade" UUID NOT NULL,
    "etiqueta_id" UUID NOT NULL,
    "ordem_producao_id" UUID NOT NULL,
    "movimento_id" UUID,
    "item_codigo" TEXT NOT NULL,
    "item_descricao" TEXT,
    "lote" TEXT,
    "serie" TEXT,
    "quantidade_produzida" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantidade_refugo" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rastreabilidades_pkey" PRIMARY KEY ("id_rastreabilidade")
);

-- CreateTable
CREATE TABLE "movimentos_historico" (
    "id_movimento_historico" UUID NOT NULL,
    "id_movimento_original" UUID NOT NULL,
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

    CONSTRAINT "movimentos_historico_pkey" PRIMARY KEY ("id_movimento_historico")
);

-- CreateTable
CREATE TABLE "ordens_producao_historico" (
    "id_ordem_producao_historico" UUID NOT NULL,
    "id_ordem_producao_original" UUID NOT NULL,
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

    CONSTRAINT "ordens_producao_historico_pkey" PRIMARY KEY ("id_ordem_producao_historico")
);

-- CreateTable
CREATE TABLE "ordens_producao_apontamento_historico" (
    "id_apontamento_historico" UUID NOT NULL,
    "ordem_producao_historico_id" UUID NOT NULL,
    "movimento_historico_id" UUID,
    "usuario_id" UUID NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_producao_apontamento_historico_pkey" PRIMARY KEY ("id_apontamento_historico")
);

-- CreateTable
CREATE TABLE "reservas_historico" (
    "id_reserva_historico" UUID NOT NULL,
    "id_reserva_original" UUID NOT NULL,
    "ordem_producao_historico_id" UUID NOT NULL,
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

    CONSTRAINT "reservas_historico_pkey" PRIMARY KEY ("id_reserva_historico")
);

-- CreateTable
CREATE TABLE "etiquetas_historico" (
    "id_etiqueta_historico" UUID NOT NULL,
    "id_etiqueta_original" UUID NOT NULL,
    "ordem_producao_historico_id" UUID NOT NULL,
    "codigo_barras" TEXT NOT NULL,
    "sequencial" INTEGER NOT NULL,
    "motivo_geracao" "MotivoGeracaoEtiqueta" NOT NULL DEFAULT 'REPORTE',
    "status" "StatusEtiqueta" NOT NULL DEFAULT 'DISPONIVEL',
    "quantidade" DECIMAL(18,4) NOT NULL,
    "unidade_medida" "TipoUnidadeMedida" NOT NULL DEFAULT 'UNIDADE',
    "impresso_em" TIMESTAMP(3),
    "baixado_em" TIMESTAMP(3),
    "usuario_id" UUID NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiquetas_historico_pkey" PRIMARY KEY ("id_etiqueta_historico")
);

-- CreateTable
CREATE TABLE "rastreabilidades_historico" (
    "id_rastreabilidade_historico" UUID NOT NULL,
    "id_rastreabilidade_original" UUID NOT NULL,
    "etiqueta_historico_id" UUID NOT NULL,
    "ordem_producao_historico_id" UUID NOT NULL,
    "item_codigo" TEXT NOT NULL,
    "item_descricao" TEXT,
    "lote" TEXT,
    "serie" TEXT,
    "quantidade_produzida" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantidade_refugo" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rastreabilidades_historico_pkey" PRIMARY KEY ("id_rastreabilidade_historico")
);

-- CreateTable
CREATE TABLE "calculos_indicadores" (
    "id_calculo_indicadores" UUID NOT NULL,
    "estabelecimento_id" UUID NOT NULL,
    "centro_trabalho_id" UUID NOT NULL,
    "turno_id" UUID,
    "dia_turno" TIMESTAMP(3) NOT NULL,
    "qtd_produzida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtd_refugo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtd_perda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtd_meta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tempo_producao" INTEGER NOT NULL DEFAULT 0,
    "tempo_parada" INTEGER NOT NULL DEFAULT 0,
    "tempo_preparacao" INTEGER NOT NULL DEFAULT 0,
    "tempo_disponivel" INTEGER NOT NULL DEFAULT 0,
    "tempo_total" INTEGER NOT NULL DEFAULT 0,
    "tempo_manutencao" INTEGER NOT NULL DEFAULT 0,
    "disponibilidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eficiencia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teep" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perda_financeira" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custo_maquina_hora" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recalcular" BOOLEAN NOT NULL DEFAULT false,
    "ultima_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculos_indicadores_pkey" PRIMARY KEY ("id_calculo_indicadores")
);

-- CreateTable
CREATE TABLE "movimentos_calculo_indicadores" (
    "id_movimento_calculo_indicadores" UUID NOT NULL,
    "calculo_indicadores_id" UUID NOT NULL,
    "movimento_id" UUID NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "tempo_segundos" INTEGER NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "considera_oee" BOOLEAN NOT NULL DEFAULT true,
    "ciclo_padrao_ordem" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custo_maquina_hora" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recalcular" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentos_calculo_indicadores_pkey" PRIMARY KEY ("id_movimento_calculo_indicadores")
);

-- CreateTable
CREATE TABLE "centros_trabalho_online" (
    "id_centro_trabalho_online" UUID NOT NULL,
    "centro_trabalho_id" UUID NOT NULL,
    "calculo_indicadores_id" UUID,
    "status" "StatusCentroTrabalhoOnline" NOT NULL DEFAULT 'DESCONECTADA',
    "movimento_aberto_id" UUID,
    "ordem_producao_id" UUID,
    "ultima_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_trabalho_online_pkey" PRIMARY KEY ("id_centro_trabalho_online")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id_notificacao" UUID NOT NULL,
    "regra_id" UUID NOT NULL,
    "destinatario" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "status" "StatusNotificacao" NOT NULL DEFAULT 'PENDENTE_ENVIO',
    "agendada_para" TIMESTAMP(3) NOT NULL,
    "enviada_em" TIMESTAMP(3),
    "mensagem_erro" TEXT,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id_notificacao")
);

-- CreateIndex
CREATE INDEX "qualidades_item_estabelecimento_id_idx" ON "qualidades_item"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "qualidades_item_estabelecimento_id_descricao_key" ON "qualidades_item"("estabelecimento_id", "descricao");

-- CreateIndex
CREATE INDEX "atualizacoes_firmware_iot_dispositivo_id_status_idx" ON "atualizacoes_firmware_iot"("dispositivo_id", "status");

-- CreateIndex
CREATE INDEX "ferramentas_estabelecimento_id_idx" ON "ferramentas"("estabelecimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "ferramentas_estabelecimento_id_codigo_key" ON "ferramentas"("estabelecimento_id", "codigo");

-- CreateIndex
CREATE INDEX "centros_trabalho_ferramenta_ferramenta_id_idx" ON "centros_trabalho_ferramenta"("ferramenta_id");

-- CreateIndex
CREATE UNIQUE INDEX "centros_trabalho_ferramenta_centro_trabalho_id_ferramenta_i_key" ON "centros_trabalho_ferramenta"("centro_trabalho_id", "ferramenta_id");

-- CreateIndex
CREATE INDEX "movimentos_ferramenta_ferramenta_id_criado_em_idx" ON "movimentos_ferramenta"("ferramenta_id", "criado_em");

-- CreateIndex
CREATE INDEX "movimentos_ferramenta_movimento_id_idx" ON "movimentos_ferramenta"("movimento_id");

-- CreateIndex
CREATE INDEX "consumos_ferramenta_ferramenta_id_data_turno_idx" ON "consumos_ferramenta"("ferramenta_id", "data_turno");

-- CreateIndex
CREATE UNIQUE INDEX "consumos_ferramenta_ferramenta_id_centro_trabalho_id_turno__key" ON "consumos_ferramenta"("ferramenta_id", "centro_trabalho_id", "turno_id", "data_turno");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_codigo_barras_key" ON "etiquetas"("codigo_barras");

-- CreateIndex
CREATE INDEX "etiquetas_ordem_producao_id_idx" ON "etiquetas"("ordem_producao_id");

-- CreateIndex
CREATE INDEX "etiquetas_estabelecimento_id_status_idx" ON "etiquetas"("estabelecimento_id", "status");

-- CreateIndex
CREATE INDEX "etiquetas_codigo_barras_idx" ON "etiquetas"("codigo_barras");

-- CreateIndex
CREATE INDEX "rastreabilidades_etiqueta_id_idx" ON "rastreabilidades"("etiqueta_id");

-- CreateIndex
CREATE INDEX "rastreabilidades_ordem_producao_id_idx" ON "rastreabilidades"("ordem_producao_id");

-- CreateIndex
CREATE INDEX "rastreabilidades_movimento_id_idx" ON "rastreabilidades"("movimento_id");

-- CreateIndex
CREATE INDEX "movimentos_historico_centro_trabalho_id_tipo_inicio_idx" ON "movimentos_historico"("centro_trabalho_id", "tipo", "inicio");

-- CreateIndex
CREATE INDEX "movimentos_historico_ordem_producao_id_idx" ON "movimentos_historico"("ordem_producao_id");

-- CreateIndex
CREATE INDEX "movimentos_historico_turno_id_data_turno_idx" ON "movimentos_historico"("turno_id", "data_turno");

-- CreateIndex
CREATE INDEX "ordens_producao_historico_estabelecimento_id_status_idx" ON "ordens_producao_historico"("estabelecimento_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_producao_historico_codigo_identificador_key" ON "ordens_producao_historico"("codigo", "identificador");

-- CreateIndex
CREATE INDEX "ordens_producao_apontamento_historico_ordem_producao_histor_idx" ON "ordens_producao_apontamento_historico"("ordem_producao_historico_id");

-- CreateIndex
CREATE INDEX "reservas_historico_ordem_producao_historico_id_idx" ON "reservas_historico"("ordem_producao_historico_id");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_historico_codigo_barras_key" ON "etiquetas_historico"("codigo_barras");

-- CreateIndex
CREATE INDEX "etiquetas_historico_ordem_producao_historico_id_idx" ON "etiquetas_historico"("ordem_producao_historico_id");

-- CreateIndex
CREATE INDEX "rastreabilidades_historico_etiqueta_historico_id_idx" ON "rastreabilidades_historico"("etiqueta_historico_id");

-- CreateIndex
CREATE INDEX "rastreabilidades_historico_ordem_producao_historico_id_idx" ON "rastreabilidades_historico"("ordem_producao_historico_id");

-- CreateIndex
CREATE INDEX "calculos_indicadores_estabelecimento_id_dia_turno_idx" ON "calculos_indicadores"("estabelecimento_id", "dia_turno");

-- CreateIndex
CREATE INDEX "calculos_indicadores_centro_trabalho_id_dia_turno_idx" ON "calculos_indicadores"("centro_trabalho_id", "dia_turno");

-- CreateIndex
CREATE UNIQUE INDEX "calculos_indicadores_centro_trabalho_id_turno_id_dia_turno_key" ON "calculos_indicadores"("centro_trabalho_id", "turno_id", "dia_turno");

-- CreateIndex
CREATE INDEX "movimentos_calculo_indicadores_movimento_id_idx" ON "movimentos_calculo_indicadores"("movimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "movimentos_calculo_indicadores_calculo_indicadores_id_movim_key" ON "movimentos_calculo_indicadores"("calculo_indicadores_id", "movimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "centros_trabalho_online_centro_trabalho_id_key" ON "centros_trabalho_online"("centro_trabalho_id");

-- CreateIndex
CREATE INDEX "centros_trabalho_online_centro_trabalho_id_idx" ON "centros_trabalho_online"("centro_trabalho_id");

-- CreateIndex
CREATE INDEX "notificacoes_regra_id_status_idx" ON "notificacoes"("regra_id", "status");

-- CreateIndex
CREATE INDEX "notificacoes_estabelecimento_id_status_agendada_para_idx" ON "notificacoes"("estabelecimento_id", "status", "agendada_para");

-- AddForeignKey
ALTER TABLE "qualidades_item" ADD CONSTRAINT "qualidades_item_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atualizacoes_firmware_iot" ADD CONSTRAINT "atualizacoes_firmware_iot_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos_iot"("idDispositivoIot") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferramentas" ADD CONSTRAINT "ferramentas_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho_ferramenta" ADD CONSTRAINT "centros_trabalho_ferramenta_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho_ferramenta" ADD CONSTRAINT "centros_trabalho_ferramenta_ferramenta_id_fkey" FOREIGN KEY ("ferramenta_id") REFERENCES "ferramentas"("id_ferramenta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_ferramenta" ADD CONSTRAINT "movimentos_ferramenta_ferramenta_id_fkey" FOREIGN KEY ("ferramenta_id") REFERENCES "ferramentas"("id_ferramenta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_ferramenta" ADD CONSTRAINT "movimentos_ferramenta_movimento_id_fkey" FOREIGN KEY ("movimento_id") REFERENCES "movimentos"("idMovimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_ferramenta" ADD CONSTRAINT "consumos_ferramenta_ferramenta_id_fkey" FOREIGN KEY ("ferramenta_id") REFERENCES "ferramentas"("id_ferramenta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_ferramenta" ADD CONSTRAINT "consumos_ferramenta_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_ferramenta" ADD CONSTRAINT "consumos_ferramenta_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("idTurno") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id_ordem_producao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_movimento_id_fkey" FOREIGN KEY ("movimento_id") REFERENCES "movimentos"("idMovimento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "layouts_etiqueta"("idLayout") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rastreabilidades" ADD CONSTRAINT "rastreabilidades_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id_etiqueta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rastreabilidades" ADD CONSTRAINT "rastreabilidades_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id_ordem_producao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rastreabilidades" ADD CONSTRAINT "rastreabilidades_movimento_id_fkey" FOREIGN KEY ("movimento_id") REFERENCES "movimentos"("idMovimento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_producao_apontamento_historico" ADD CONSTRAINT "ordens_producao_apontamento_historico_ordem_producao_histo_fkey" FOREIGN KEY ("ordem_producao_historico_id") REFERENCES "ordens_producao_historico"("id_ordem_producao_historico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_historico" ADD CONSTRAINT "reservas_historico_ordem_producao_historico_id_fkey" FOREIGN KEY ("ordem_producao_historico_id") REFERENCES "ordens_producao_historico"("id_ordem_producao_historico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas_historico" ADD CONSTRAINT "etiquetas_historico_ordem_producao_historico_id_fkey" FOREIGN KEY ("ordem_producao_historico_id") REFERENCES "ordens_producao_historico"("id_ordem_producao_historico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rastreabilidades_historico" ADD CONSTRAINT "rastreabilidades_historico_etiqueta_historico_id_fkey" FOREIGN KEY ("etiqueta_historico_id") REFERENCES "etiquetas_historico"("id_etiqueta_historico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rastreabilidades_historico" ADD CONSTRAINT "rastreabilidades_historico_ordem_producao_historico_id_fkey" FOREIGN KEY ("ordem_producao_historico_id") REFERENCES "ordens_producao_historico"("id_ordem_producao_historico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculos_indicadores" ADD CONSTRAINT "calculos_indicadores_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculos_indicadores" ADD CONSTRAINT "calculos_indicadores_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculos_indicadores" ADD CONSTRAINT "calculos_indicadores_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("idTurno") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_calculo_indicadores" ADD CONSTRAINT "movimentos_calculo_indicadores_calculo_indicadores_id_fkey" FOREIGN KEY ("calculo_indicadores_id") REFERENCES "calculos_indicadores"("id_calculo_indicadores") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_calculo_indicadores" ADD CONSTRAINT "movimentos_calculo_indicadores_movimento_id_fkey" FOREIGN KEY ("movimento_id") REFERENCES "movimentos"("idMovimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho_online" ADD CONSTRAINT "centros_trabalho_online_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_trabalho_online" ADD CONSTRAINT "centros_trabalho_online_calculo_indicadores_id_fkey" FOREIGN KEY ("calculo_indicadores_id") REFERENCES "calculos_indicadores"("id_calculo_indicadores") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_regra_id_fkey" FOREIGN KEY ("regra_id") REFERENCES "regras_notificacao"("idRegraNotificacao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;
