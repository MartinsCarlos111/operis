import { describe, it, expect } from 'vitest';
import { ConsultarFalhasIotUseCase } from './consultar-falhas-iot.use-case.js';
import { DispositivoIot } from '../../domain/entities/dispositivo-iot.js';
import { FalhaLeituraIot } from '../../domain/entities/falha-leitura-iot.js';
import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import type { FalhaLeituraIotRepository } from '../../domain/repositories/falha-leitura-iot.repository.js';

const DISPOSITIVO_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ESTABELECIMENTO_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const AGORA = new Date('2026-08-05T10:00:00Z');

function dispositivo(): DispositivoIot {
  return DispositivoIot.criar({
    idDispositivoIot: DISPOSITIVO_ID,
    serial: 'COL-0001',
    nome: 'Coletor teste',
    estabelecimentoId: ESTABELECIMENTO_ID,
  });
}

function falha(ocorridoEm: Date, motivo: FalhaLeituraIot['motivo'], dispositivoId: string | null): FalhaLeituraIot {
  return FalhaLeituraIot.criar({
    idFalhaLeituraIot: `falha-${ocorridoEm.getTime()}`,
    dispositivoId,
    serial: 'COL-0001',
    input: 1,
    motivo,
    ocorridoEm,
  });
}

class DispositivosEmMemoria implements DispositivoIotRepository {
  itens: DispositivoIot[] = [];
  async buscarPorId(id: string) {
    return this.itens.find((d) => d.idDispositivoIot === id) ?? null;
  }
  async buscarPorSerial() {
    return null;
  }
  async listar() {
    return this.itens;
  }
  async contar() {
    return this.itens.length;
  }
  async salvar() {}
  async excluir() {}
}

class FalhasEmMemoria implements FalhaLeituraIotRepository {
  itens: FalhaLeituraIot[] = [];
  criterioRecebido: unknown;
  async salvarLote() {
    return 0;
  }
  async listar(criterio: { serial: string; de: Date; ate: Date }) {
    this.criterioRecebido = criterio;
    return this.itens
      .filter((f) => f.ocorridoEm >= criterio.de && f.ocorridoEm <= criterio.ate)
      .sort((a, b) => b.ocorridoEm.getTime() - a.ocorridoEm.getTime());
  }
  async contar(criterio: { serial: string; de: Date; ate: Date }) {
    return this.itens.filter((f) => f.ocorridoEm >= criterio.de && f.ocorridoEm <= criterio.ate).length;
  }
}

describe('ConsultarFalhasIotUseCase', () => {
  it('usa o turno corrente (últimas 24h) quando não há período informado', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo()];
    const falhas = new FalhasEmMemoria();
    const useCase = new ConsultarFalhasIotUseCase(dispositivos, falhas, () => AGORA);

    await useCase.executar({ dispositivoId: DISPOSITIVO_ID, estabelecimentoId: ESTABELECIMENTO_ID });

    const criterio = falhas.criterioRecebido as { serial: string; de: Date; ate: Date };
    expect(criterio.serial).toBe('COL-0001');
    expect(criterio.ate).toEqual(AGORA);
    expect(criterio.de.getTime()).toBe(AGORA.getTime() - 24 * 60 * 60 * 1000);
  });

  it('lista falhas pelo serial mesmo quando dispositivoId é nulo (pré-cadastro)', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo()];
    const falhas = new FalhasEmMemoria();
    falhas.itens = [
      falha(new Date('2026-08-05T09:00:00Z'), 'ENTRADA_NAO_CONFIGURADA', DISPOSITIVO_ID),
      falha(new Date('2026-08-05T08:00:00Z'), 'DISPOSITIVO_NAO_CADASTRADO', null),
    ];
    const useCase = new ConsultarFalhasIotUseCase(dispositivos, falhas, () => AGORA);

    const dto = await useCase.executar({ dispositivoId: DISPOSITIVO_ID, estabelecimentoId: ESTABELECIMENTO_ID });

    expect(dto.total).toBe(2);
    expect(dto.falhas.map((f) => f.motivo)).toEqual([
      'ENTRADA_NAO_CONFIGURADA',
      'DISPOSITIVO_NAO_CADASTRADO',
    ]);
  });

  it('respeita o período informado', async () => {
    const dispositivos = new DispositivosEmMemoria();
    dispositivos.itens = [dispositivo()];
    const falhas = new FalhasEmMemoria();
    falhas.itens = [
      falha(new Date('2026-08-01T09:00:00Z'), 'ENTRADA_NAO_CONFIGURADA', DISPOSITIVO_ID),
      falha(new Date('2026-08-05T09:00:00Z'), 'ENTRADA_DESABILITADA', DISPOSITIVO_ID),
    ];
    const useCase = new ConsultarFalhasIotUseCase(dispositivos, falhas, () => AGORA);

    const dto = await useCase.executar({
      dispositivoId: DISPOSITIVO_ID,
      estabelecimentoId: ESTABELECIMENTO_ID,
      de: new Date('2026-08-05T00:00:00Z'),
      ate: AGORA,
    });

    expect(dto.total).toBe(1);
    expect(dto.falhas[0]!.motivo).toBe('ENTRADA_DESABILITADA');
  });

  it('lança erro quando o dispositivo não existe', async () => {
    const dispositivos = new DispositivosEmMemoria();
    const falhas = new FalhasEmMemoria();
    const useCase = new ConsultarFalhasIotUseCase(dispositivos, falhas, () => AGORA);

    await expect(
      useCase.executar({ dispositivoId: 'inexistente', estabelecimentoId: ESTABELECIMENTO_ID }),
    ).rejects.toThrow();
    expect(falhas.criterioRecebido).toBeUndefined();
  });
});
