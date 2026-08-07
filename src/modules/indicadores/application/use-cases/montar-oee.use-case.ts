import type { CalculoIndicadores } from '../../domain/entities/calculo-indicadores.js';
import type { MontarOeeService, TurnoLike } from '../../domain/services/montar-oee.service.js';

export interface InputMontarOeeUseCase {
  estabelecimentoId: string;
  centroTrabalhoId: string;
  turno: TurnoLike;
  diaTurno: Date;
  custoMaquinaHora: number;
  qtdMeta: number;
}

/**
 * Application layer que aciona o `MontarOeeService`. Exposto como UC para que
 * a rota admin `/indicadores/recalcular` possar ser chamada manualmente
 * além do worker automático.
 */
export class MontarOeeUseCase {
  constructor(private readonly servico: MontarOeeService) {}

  async executar(input: InputMontarOeeUseCase): Promise<CalculoIndicadores | null> {
    return this.servico.montarPorTurno(input);
  }
}