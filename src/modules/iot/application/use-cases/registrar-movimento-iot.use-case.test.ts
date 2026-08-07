import { describe, it, expect } from 'vitest';
import { RegistrarMovimentoIotUseCase } from './registrar-movimento-iot.use-case.js';
import { DispositivoIot } from '../../domain/entities/dispositivo-iot.js';
import { EntradaIot } from '../../domain/entities/entrada-iot.js';
import { LeituraIot } from '../../domain/entities/leitura-iot.js';
import { FalhaLeituraIot } from '../../domain/entities/falha-leitura-iot.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { LeituraIotRepository } from '../../domain/repositories/leitura-iot.repository.js';
import type { FalhaLeituraIotRepository } from '../../domain/repositories/falha-leitura-iot.repository.js';
import type { MovimentoRecebido } from '../../domain/gateways/consumidor-mensagens-iot.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';

const DISPOSITIVO_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ESTABELECIMENTO_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const idsSequenciais: GeradorId = (() => {
  let n = 0;
  return { gerar: () => `id-${++n}` };
})();

function dispositivo(entradas: EntradaIot[], serial = 'COL-0001'): DispositivoIot {
  const d = DispositivoIot.criar({
    idDispositivoIot: DISPOSITIVO_ID,
    serial,
    nome: 'Coletor teste',
    estabelecimentoId: ESTABELECIMENTO_ID,
  });
  d.definirEntradas(entradas);
  return d;
}

function entrada(input: number, habilitado = true): EntradaIot {
  return EntradaIot.criar({
    idEntradaIot: `entrada-${input}`,
    dispositivoId: DISPOSITIVO_ID,
    input,
    label: `Porta ${input}`,
    tipo: 'PNP',
    contexto: 'PRODUZINDO_NAO_PRODUZINDO',
    funcao: 'PULSO',
    habilitado,
  });
}

function movimento(serial: string, input: number, valor = 1): MovimentoRecebido {
  return { serial, input, contexto: 0, valor, ocorridoEm: new Date('2026-08-05T10:00:00Z') };
}

class DispositivosEmMemoria implements DispositivoIotRepository {
  itens: DispositivoIot[] = [];
  async buscarPorId(id: string) {
    return this.itens.find((d) => d.idDispositivoIot === id) ?? null;
  }
  async buscarPorSerial(serial: string) {
    return this.itens.find((d) => d.serial === serial) ?? null;
  }
  async listar() {
    return this.itens;
  }
  async contar() {
    return this.itens.length;
  }
  async salvar(d: DispositivoIot) {
    this.itens = this.itens.filter((x) => x.idDispositivoIot !== d.idDispositivoIot).concat(d);
  }
  async excluir(id: string) {
    this.itens = this.itens.filter((x) => x.idDispositivoIot !== id);
  }
}

class LeiturasEmMemoria implements LeituraIotRepository {
  gravadas: LeituraIot[] = [];
  async salvarLote(leituras: LeituraIot[]) {
    this.gravadas.push(...leituras);
    return leituras.length;
  }
  async listar() {
    return this.gravadas;
  }
  async contarPorEntrada() {
    return [];
  }
  async estadoDaEntrada(criterio: { input: number }) {
    return { input: criterio.input, valorAtual: null, transicoes: 0, ocorrencias: 0, ultimaLeituraEm: null };
  }
}

class FalhasEmMemoria implements FalhaLeituraIotRepository {
  gravadas: FalhaLeituraIot[] = [];
  async salvarLote(falhas: FalhaLeituraIot[]) {
    // Espelha o `skipDuplicates` do repo Prisma (índice único em chaveEvento).
    const jaVistas = new Set(this.gravadas.map((f) => f.chaveEvento));
    const novas = falhas.filter((f) => !jaVistas.has(f.chaveEvento));
    this.gravadas.push(...novas);
    return novas.length;
  }
  async listar() {
    return this.gravadas;
  }
  async contar() {
    return this.gravadas.length;
  }
}

describe('RegistrarMovimentoIotUseCase', () => {
  it('grava a leitura válida e não registra falha', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo([entrada(1)])];
    const leituras = new LeiturasEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new RegistrarMovimentoIotUseCase(
      dispositivos,
      leituras,
      falhas,
      idsSequenciais,
    );

    const resultado = await useCase.executar([movimento('COL-0001', 1)]);

    expect(resultado.registradas).toBe(1);
    expect(resultado.descartadas).toHaveLength(0);
    expect(leituras.gravadas).toHaveLength(1);
    expect(leituras.gravadas[0]!.dispositivoId).toBe(DISPOSITIVO_ID);
    expect(falhas.gravadas).toHaveLength(0);
  });

  it('registra falha DISPOSITIVO_NAO_CADASTRADO com dispositivoId nulo', async () => {
    const dispositivos = new DispositivosEmMemoria();
    const leituras = new LeiturasEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new RegistrarMovimentoIotUseCase(
      dispositivos,
      leituras,
      falhas,
      idsSequenciais,
    );

    const resultado = await useCase.executar([movimento('DESCONHECIDO', 1)]);

    expect(resultado.registradas).toBe(0);
    expect(resultado.descartadas).toEqual([
      { serial: 'DESCONHECIDO', input: 1, motivo: 'DISPOSITIVO_NAO_CADASTRADO' },
    ]);
    expect(falhas.gravadas).toHaveLength(1);
    expect(falhas.gravadas[0]!.dispositivoId).toBeNull();
    expect(falhas.gravadas[0]!.serial).toBe('DESCONHECIDO');
    expect(falhas.gravadas[0]!.motivo).toBe('DISPOSITIVO_NAO_CADASTRADO');
  });

  it('registra falha ENTRADA_NAO_CONFIGURADA para porta sem configuração', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo([entrada(1)])];
    const leituras = new LeiturasEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new RegistrarMovimentoIotUseCase(
      dispositivos,
      leituras,
      falhas,
      idsSequenciais,
    );

    const resultado = await useCase.executar([movimento('COL-0001', 2)]);

    expect(resultado.registradas).toBe(0);
    expect(falhas.gravadas[0]!.motivo).toBe('ENTRADA_NAO_CONFIGURADA');
    expect(falhas.gravadas[0]!.dispositivoId).toBe(DISPOSITIVO_ID);
  });

  it('registra falha ENTRADA_DESABILITADA para porta desabilitada', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo([entrada(1, false)])];
    const leituras = new LeiturasEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new RegistrarMovimentoIotUseCase(
      dispositivos,
      leituras,
      falhas,
      idsSequenciais,
    );

    const resultado = await useCase.executar([movimento('COL-0001', 1)]);

    expect(resultado.registradas).toBe(0);
    expect(falhas.gravadas[0]!.motivo).toBe('ENTRADA_DESABILITADA');
  });

  it('registra falha PAYLOAD_INVALIDO quando o valor não é numérico', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo([entrada(1)])];
    const leituras = new LeiturasEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new RegistrarMovimentoIotUseCase(
      dispositivos,
      leituras,
      falhas,
      idsSequenciais,
    );

    const resultado = await useCase.executar([movimento('COL-0001', 1, Number.NaN)]);

    expect(resultado.registradas).toBe(0);
    expect(falhas.gravadas[0]!.motivo).toBe('PAYLOAD_INVALIDO');
  });

  it('deduplica falhas pela chaveEvento (serial + input + instante)', async () => {
    const dispositivos = new DispositivosEmMemoria();
    const leituras = new LeiturasEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new RegistrarMovimentoIotUseCase(
      dispositivos,
      leituras,
      falhas,
      idsSequenciais,
    );

    const mov = movimento('DESCONHECIDO', 1);
    await useCase.executar([mov]);
    await useCase.executar([{ ...mov }]);

    expect(falhas.gravadas).toHaveLength(1);
  });
});
