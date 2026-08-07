-- Renomeia o cadastro de manufatura de "artigo" para "item" (paridade com o
-- legado Octopus, que chama o conceito de `Item`). Preserva os dados existentes.

ALTER TABLE "artigos" RENAME TO "itens";
ALTER TABLE "artigos_centros_trabalho" RENAME TO "itens_centros_trabalho";

ALTER TABLE "itens" RENAME COLUMN "id_artigo" TO "id_item";
ALTER TABLE "itens_centros_trabalho" RENAME COLUMN "id_artigo_centro_trabalho" TO "id_item_centro_trabalho";
ALTER TABLE "itens_centros_trabalho" RENAME COLUMN "artigo_id" TO "item_id";

ALTER TABLE "itens" RENAME CONSTRAINT "artigos_pkey" TO "itens_pkey";
ALTER TABLE "itens" RENAME CONSTRAINT "artigos_estabelecimento_id_fkey" TO "itens_estabelecimento_id_fkey";
ALTER TABLE "itens_centros_trabalho" RENAME CONSTRAINT "artigos_centros_trabalho_pkey" TO "itens_centros_trabalho_pkey";
ALTER TABLE "itens_centros_trabalho" RENAME CONSTRAINT "artigos_centros_trabalho_artigo_id_fkey" TO "itens_centros_trabalho_item_id_fkey";
ALTER TABLE "itens_centros_trabalho" RENAME CONSTRAINT "artigos_centros_trabalho_centro_trabalho_id_fkey" TO "itens_centros_trabalho_centro_trabalho_id_fkey";

ALTER INDEX "artigos_estabelecimento_id_codigo_key" RENAME TO "itens_estabelecimento_id_codigo_key";
ALTER INDEX "artigos_estabelecimento_id_status_idx" RENAME TO "itens_estabelecimento_id_status_idx";
ALTER INDEX "artigos_centros_trabalho_artigo_id_centro_trabalho_id_key" RENAME TO "itens_centros_trabalho_item_id_centro_trabalho_id_key";
ALTER INDEX "artigos_centros_trabalho_centro_trabalho_id_ativo_idx" RENAME TO "itens_centros_trabalho_centro_trabalho_id_ativo_idx";

-- Permissões: "manufatura:artigos-ciclos:*" → "manufatura:itens-ciclos:*".
-- Os vínculos em niveis_acesso_permissoes usam idPermissao (inalterado).
UPDATE "permissoes"
SET "chave" = 'manufatura:itens-ciclos' || substring("chave" from length('manufatura:artigos-ciclos') + 1),
    "grupo" = 'manufatura:itens-ciclos',
    "descricao" = 'Itens e ciclos' || substring("descricao" from length('Artigos e ciclos') + 1)
WHERE "grupo" = 'manufatura:artigos-ciclos' OR "chave" LIKE 'manufatura:artigos-ciclos:%';
