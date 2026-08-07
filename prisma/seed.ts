import { ScryptHasherSenha } from '../src/modules/operis_control/infrastructure/gateways/scrypt-hasher-senha.js';
import { CATALOGO_PERMISSOES_PADRAO } from '../src/shared/rbac/catalogo-permissoes.js';
import { PrismaClient } from '@prisma/client';

/**
 * Seed do catálogo de permissões + bootstrap de um estabelecimento com um
 * nível "Administrador" (todas as permissões) e um usuário admin vinculado.
 * Resolve o problema do ovo-e-galinha: as rotas de gestão exigem permissões
 * que só existem depois do seed.
 *
 * O catálogo vem de `CATALOGO_PERMISSOES_PADRAO` (fonte única de verdade,
 * usada também pelas rotas via `autorizar(...)`) — nunca duplicar a lista de
 * grupos/ações aqui, ou o seed volta a dessincronizar do que as rotas exigem.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. Catálogo de permissões (idempotente via upsert pela chave única).
  for (const p of CATALOGO_PERMISSOES_PADRAO) {
    await prisma.permissao.upsert({
      where: { chave: p.chave },
      create: p,
      update: { descricao: p.descricao },
    });
  }
  console.log(`Catálogo: ${CATALOGO_PERMISSOES_PADRAO.length} permissões garantidas.`);

  // 2. Estabelecimento matriz (bootstrap).
  const matriz = await prisma.estabelecimento.upsert({
    where: { idEstabelecimento: '00000000-0000-0000-0000-000000000001' },
    create: {
      idEstabelecimento: '00000000-0000-0000-0000-000000000001',
      descricao: 'Matriz',
      impressoras: 'ATIVO',
      coletores: 'ATIVO',
      checklist: 'ATIVO',
      manufatura: 'ATIVO',
    },
    update: {},
  });

  // 3. Nível "Administrador" com TODAS as permissões do catálogo.
  const todas = await prisma.permissao.findMany({ select: { idPermissao: true } });
  const admin = await prisma.nivelAcesso.upsert({
    where: {
      estabelecimentoId_nome: {
        estabelecimentoId: matriz.idEstabelecimento,
        nome: 'Administrador',
      },
    },
    create: {
      nome: 'Administrador',
      descricao: 'Acesso total ao estabelecimento',
      estabelecimentoId: matriz.idEstabelecimento,
    },
    update: {},
  });
  await prisma.nivelAcessoPermissao.deleteMany({ where: { nivelAcessoId: admin.idNivelAcesso } });
  await prisma.nivelAcessoPermissao.createMany({
    data: todas.map((p) => ({ nivelAcessoId: admin.idNivelAcesso, permissaoId: p.idPermissao })),
  });

  // 4. Usuário admin vinculado à matriz como Administrador.
  const usuarioAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@operis.local' },
    create: { nome: 'Administrador', email: 'admin@operis.local' },
    update: {},
  });
  await prisma.usuarioEstabelecimento.upsert({
    where: {
      usuarioId_estabelecimentoId: {
        usuarioId: usuarioAdmin.idUsuario,
        estabelecimentoId: matriz.idEstabelecimento,
      },
    },
    create: {
      usuarioId: usuarioAdmin.idUsuario,
      estabelecimentoId: matriz.idEstabelecimento,
      nivelAcessoId: admin.idNivelAcesso,
    },
    update: { nivelAcessoId: admin.idNivelAcesso },
  });

  console.log(`Bootstrap: estabelecimento "Matriz", nível "Administrador", usuário admin@operis.local.`);

  // 5. Primeiro super-admin do Control Plane (painel /admin). Resolve o
  // ovo-e-galinha: criar super-admins via rota exige um super-admin logado.
  // Credenciais iniciais vêm do ambiente (nunca hardcoded em produção).
  const emailSuperAdmin = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'suporte@operis.local';
  const senhaSuperAdmin = process.env.SEED_SUPER_ADMIN_SENHA ?? 'troque-esta-senha';
  const hasher = new ScryptHasherSenha();
  await prisma.superAdmin.upsert({
    where: { email: emailSuperAdmin },
    create: {
      nome: 'Suporte Operis',
      email: emailSuperAdmin,
      senhaHash: await hasher.gerarHash(senhaSuperAdmin),
    },
    update: {},
  });
  console.log(`Bootstrap Control Plane: super-admin "${emailSuperAdmin}" garantido.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
