import { PrismaClient } from '@prisma/client';
import { PrismaTenantRepository } from '../src/modules/operis_control/infrastructure/persistence/prisma-tenant.repository.js';
import { AesGcmEncryptionService } from '../src/modules/operis_control/infrastructure/gateways/aes-gcm-encryption.service.js';
import { PrismaProvisionadorSchema } from '../src/modules/operis_control/infrastructure/gateways/prisma-provisionador-schema.js';
import type { DadosConexaoBanco } from '../src/modules/operis_control/domain/gateways/validador-conexao-banco.js';

/**
 * Reprovisionamento manual do schema nos bancos dedicados (Data Plane) de
 * todos os tenants cadastrados no Control Plane. Útil após adicionar models
 * novos ao schema.prisma (ex.: falhas_leitura_iot) sem criar um tenant novo.
 *
 * Reutiliza a mesma esteira do fluxo de cadastro: lê a configuração do banco
 * no Control Plane, decifra a senha em memória e aplica `prisma db push`
 * apontado para a URL do tenant. Nunca loga senha.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const chaveMestra = process.env.ENCRYPTION_MASTER_KEY;
  if (!chaveMestra) {
    throw new Error('ENCRYPTION_MASTER_KEY é obrigatória para decifrar as senhas dos tenants');
  }

  const encryption = new AesGcmEncryptionService(chaveMestra);
  const provisionador = new PrismaProvisionadorSchema();
  const tenants = new PrismaTenantRepository(prisma);

  const comBanco = (await tenants.listar()).filter((tenant) => tenant.banco !== null);
  if (comBanco.length === 0) {
    console.log('Nenhum tenant com banco configurado para reprovisionar.');
    return;
  }

  console.log(`Reprovisionando schema de ${comBanco.length} tenant(s)...`);
  let falhas = 0;

  for (const tenant of comBanco) {
    const banco = tenant.banco!;
    const rotulo = `${tenant.nome} (${tenant.slug.valor})`;
    try {
      const dados: DadosConexaoBanco = {
        host: banco.host,
        porta: banco.porta,
        nomeBanco: banco.nomeBanco,
        usuario: banco.usuario,
        senha: encryption.decifrar(banco.senhaCifrada),
        sslHabilitado: banco.sslHabilitado,
      };
      await provisionador.provisionar(dados);
      console.log(`OK   ${rotulo} — schema atualizado (db push)`);
    } catch (erro) {
      falhas += 1;
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      console.error(`ERR  ${rotulo} — ${mensagem}`);
    }
  }

  if (falhas > 0) {
    console.error(`${falhas} tenant(s) falharam — corrija antes de prosseguir.`);
    process.exitCode = 1;
  } else {
    console.log('Todos os tenants reprovisionados com sucesso.');
  }
}

main()
  .catch((erro: unknown) => {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error(`Falha no reprovisionamento: ${mensagem}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
