-- Corrige os enums de EntradaIot/LeituraIot para os valores reais do
-- firmware (paridade com EnumTypeIOT/EnumContextIOT/EnumFunctionIOT do
-- legado). Os valores antigos (DIGITAL/PRODUCAO/CONTADOR etc.) nunca
-- correspondiam ao protocolo real do coletor; as tabelas afetadas só tinham
-- dados de teste, por isso são limpas em vez de remapeadas.
TRUNCATE TABLE "entradas_iot", "leituras_iot", "falhas_leitura_iot";

-- AlterEnum
BEGIN;
CREATE TYPE "ContextoIot_new" AS ENUM ('LIGADO_DESLIGADO', 'PRODUZINDO_NAO_PRODUZINDO', 'GENERICO', 'VELOCIDADE_ANGULAR', 'VELOCIDADE_LINEAR', 'CONTAGEM_CICLOS', 'CONTAGEM_ITENS', 'METROS_PRODUZIDOS', 'VOLUME_PRODUZIDO', 'TEMPO_DECORRIDO', 'TEMPERATURA', 'PRESSAO', 'PERCENTUAL', 'VIBRACAO', 'VAZAO_VOLUMETRICA', 'VAZAO_MASSICA', 'DISTANCIA', 'CORRENTE');
ALTER TABLE "entradas_iot" ALTER COLUMN "contexto" TYPE "ContextoIot_new" USING ("contexto"::text::"ContextoIot_new");
ALTER TABLE "leituras_iot" ALTER COLUMN "contexto" TYPE "ContextoIot_new" USING ("contexto"::text::"ContextoIot_new");
ALTER TYPE "ContextoIot" RENAME TO "ContextoIot_old";
ALTER TYPE "ContextoIot_new" RENAME TO "ContextoIot";
DROP TYPE "public"."ContextoIot_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "FuncaoIot_new" AS ENUM ('PULSO', 'ACIONADO', 'ENCODER', 'PULSO_INICIO', 'PULSO_FIM');
ALTER TABLE "entradas_iot" ALTER COLUMN "funcao" TYPE "FuncaoIot_new" USING ("funcao"::text::"FuncaoIot_new");
ALTER TYPE "FuncaoIot" RENAME TO "FuncaoIot_old";
ALTER TYPE "FuncaoIot_new" RENAME TO "FuncaoIot";
DROP TYPE "public"."FuncaoIot_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TipoEntradaIot_new" AS ENUM ('PNP', 'NPN', 'CHANGE_PNP', 'CHANGE_NPN');
ALTER TABLE "entradas_iot" ALTER COLUMN "tipo" TYPE "TipoEntradaIot_new" USING ("tipo"::text::"TipoEntradaIot_new");
ALTER TYPE "TipoEntradaIot" RENAME TO "TipoEntradaIot_old";
ALTER TYPE "TipoEntradaIot_new" RENAME TO "TipoEntradaIot";
DROP TYPE "public"."TipoEntradaIot_old";
COMMIT;
