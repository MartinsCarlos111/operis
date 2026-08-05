import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const url = readFileSync(process.env.TEMP + '/tenant_url.txt', 'utf8').trim();
const t = new PrismaClient({ datasources: { db: { url } } });

try {
  const est = await t.estabelecimento.findFirst();
  if (!est) throw new Error('sem estabelecimento');

  const d = await t.dispositivoIot.upsert({
    where: { serial: '5193853231773985916' },
    create: {
      idDispositivoIot: randomUUID(),
      serial: '5193853231773985916',
      nome: 'Coletor Teste',
      modelo: 0,
      estabelecimentoId: est.idEstabelecimento,
      centroTrabalho: 'Usinagem',
    },
    update: {},
  });
  console.log('DISPOSITIVO: ' + d.idDispositivoIot + ' serial=' + d.serial);

  const e = await t.entradaIot.upsert({
    where: { dispositivoId_input_tipo: { dispositivoId: d.idDispositivoIot, input: 1, tipo: 'DIGITAL' } },
    create: {
      idEntradaIot: randomUUID(),
      dispositivoId: d.idDispositivoIot,
      input: 1,
      label: 'Ciclo concluido',
      tipo: 'DIGITAL',
      contexto: 'PRODUCAO',
      funcao: 'CONTADOR',
      habilitado: true,
    },
    update: { habilitado: true },
  });
  console.log('ENTRADA: input=' + e.input + ' ' + e.label + ' funcao=' + e.funcao);
} catch (err) {
  console.log('ERRO: ' + String(err?.message ?? err).split('\n')[0]);
} finally {
  await t.$disconnect();
}
