import type { CentroTrabalhoComColetoresDTO } from '../dtos/monitor.dtos.js';

/** Um centro de trabalho ativo — porta injetada do módulo manufatura (fronteira). */
export interface CentroTrabalhoResumo {
  idCentroTrabalho: string;
  codigo: string;
  descricao: string;
  status: 'ATIVO' | 'INATIVO';
}

/** Um coletor IoT com o centro de trabalho vinculado — porta injetada do módulo iot (fronteira). */
export interface DispositivoIotResumo {
  id: string;
  nome: string;
  serial: string;
  centroTrabalhoId: string | null;
}

export interface RepositoryCentrosComColetores {
  listarCentros(estabelecimentoId: string): Promise<CentroTrabalhoResumo[]>;
}

export interface RepositoryDispositivosComColetores {
  listarDispositivos(estabelecimentoId: string): Promise<DispositivoIotResumo[]>;
  /** Seriais (client_id MQTT) atualmente conectados ao broker do tenant. */
  seriaisConectados(tenantId: string): Promise<Set<string>>;
}

/**
 * Status operacional do centro (apontamento de produção) — porta injetada do
 * módulo monitor local (mesmo módulo, sem cruzar fronteira).
 */
export interface RepositoryStatusOperacional {
  /** `null` quando nunca houve snapshot calculado para o centro. */
  buscarStatus(centroTrabalhoId: string): Promise<'PRODUZINDO' | 'PARADA' | string | null>;
}

/**
 * Agrega centros de trabalho com os coletores IoT vinculados a cada um, para
 * a tela Manufatura → Monitores → Monitoramento de Coletores (um card por
 * centro de trabalho). Cada dispositivo ganha um status combinado de 4
 * valores: OFFLINE (sem conexão ao broker, independe do apontamento),
 * PRODUZINDO/PARADA (online + status operacional do centro) ou OCIOSO
 * (online, mas sem movimento de produção aberto no centro). O status
 * operacional é por CENTRO DE TRABALHO (CentroTrabalhoOnline), não por
 * dispositivo — coletores do mesmo centro compartilham esse componente do
 * status combinado.
 */
export class ListarCentrosTrabalhoComColetoresUseCase {
  constructor(
    private readonly centros: RepositoryCentrosComColetores,
    private readonly dispositivos: RepositoryDispositivosComColetores,
    private readonly statusOperacional: RepositoryStatusOperacional,
  ) {}

  async executar(input: {
    estabelecimentoId: string;
    tenantId: string;
  }): Promise<CentroTrabalhoComColetoresDTO[]> {
    const [listaCentros, listaDispositivos, conectados] = await Promise.all([
      this.centros.listarCentros(input.estabelecimentoId),
      this.dispositivos.listarDispositivos(input.estabelecimentoId),
      this.dispositivos.seriaisConectados(input.tenantId),
    ]);

    const dispositivosPorCentro = new Map<string, DispositivoIotResumo[]>();
    for (const dispositivo of listaDispositivos) {
      if (!dispositivo.centroTrabalhoId) continue;
      const lista = dispositivosPorCentro.get(dispositivo.centroTrabalhoId) ?? [];
      lista.push(dispositivo);
      dispositivosPorCentro.set(dispositivo.centroTrabalhoId, lista);
    }

    return Promise.all(
      listaCentros.map(async (centro) => {
        const vinculados = dispositivosPorCentro.get(centro.idCentroTrabalho) ?? [];
        const statusCentro = await this.statusOperacional.buscarStatus(centro.idCentroTrabalho);
        const dispositivosDTO = vinculados.map((d) => {
          const online = conectados.has(d.serial);
          return {
            id: d.id,
            nome: d.nome,
            serial: d.serial,
            online,
            statusCombinado: this.statusCombinado(online, statusCentro),
          };
        });
        return {
          idCentroTrabalho: centro.idCentroTrabalho,
          codigo: centro.codigo,
          descricao: centro.descricao,
          status: centro.status,
          dispositivos: dispositivosDTO,
          algumOnline: dispositivosDTO.some((d) => d.online),
        };
      }),
    );
  }

  private statusCombinado(
    online: boolean,
    statusCentro: string | null,
  ): 'OFFLINE' | 'PRODUZINDO' | 'PARADA' | 'OCIOSO' {
    if (!online) return 'OFFLINE';
    if (statusCentro === 'PRODUZINDO') return 'PRODUZINDO';
    if (statusCentro === 'PARADA') return 'PARADA';
    return 'OCIOSO';
  }
}
