-- O vínculo de DispositivoIot com o centro de trabalho era um campo de texto
-- livre (sem integridade referencial). Vira FK real para permitir agrupar
-- coletores por centro de trabalho na tela de Monitoramento de Coletores.
-- Não há como preservar automaticamente o valor de texto livre como UUID
-- válido — a associação precisa ser refeita manualmente pela nova UI.
ALTER TABLE "dispositivos_iot" DROP COLUMN "centro_trabalho";
ALTER TABLE "dispositivos_iot" ADD COLUMN "centro_trabalho_id" UUID;

ALTER TABLE "dispositivos_iot" ADD CONSTRAINT "dispositivos_iot_centro_trabalho_id_fkey" FOREIGN KEY ("centro_trabalho_id") REFERENCES "centros_trabalho"("idCentroTrabalho") ON DELETE SET NULL ON UPDATE CASCADE;
