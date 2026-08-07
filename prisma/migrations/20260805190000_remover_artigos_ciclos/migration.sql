-- Remove o cadastro de "itens" (ex-"artigos") e "ciclos" (itens por centro de
-- trabalho) do módulo de manufatura, junto com a configuração de colunas da
-- tela e as permissões associadas.

DROP TABLE "itens_centros_trabalho";
DROP TABLE "itens";
DROP TABLE "configuracoes_campos";

-- Permissões: "manufatura:itens-ciclos:*" (e eventuais resíduos
-- "manufatura:artigos-ciclos:*"). Os vínculos em niveis_acesso_permissoes são
-- removidos por ON DELETE CASCADE.
DELETE FROM "permissoes"
WHERE "grupo" = 'manufatura:itens-ciclos'
   OR "chave" LIKE 'manufatura:itens-ciclos:%'
   OR "grupo" = 'manufatura:artigos-ciclos'
   OR "chave" LIKE 'manufatura:artigos-ciclos:%';
