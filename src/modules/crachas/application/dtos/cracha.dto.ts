import type { Cracha } from '../../domain/entities/cracha.js';
import type { StatusRecurso } from '@shared/domain/status-recurso.js';

/**
 * Saída de um Crachá. Espelha o CrachaModel do Octopus (cdCracha/nome/ativo)
 * com vocabulário do operis. Os campos de biometria do legado NÃO são expostos
 * aqui — as digitais vivem no agregado CrachaBiometria (operis-bio-bridge).
 */
export interface CrachaDTO {
  idCracha: string;
  codigo: string;
  nome: string;
  status: StatusRecurso;
  criadoEm: string;
  atualizadoEm: string;
}

export function paraCrachaDTO(cracha: Cracha): CrachaDTO {
  return {
    idCracha: cracha.idCracha,
    codigo: cracha.codigo,
    nome: cracha.nome,
    status: cracha.status,
    criadoEm: cracha.criadoEm.toISOString(),
    atualizadoEm: cracha.atualizadoEm.toISOString(),
  };
}
