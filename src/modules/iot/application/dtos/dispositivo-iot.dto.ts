import type { DispositivoIot } from '../../domain/entities/dispositivo-iot.js';
import type {
  ContextoIot,
  EntradaIot,
  FuncaoIot,
  TipoEntradaIot,
} from '../../domain/entities/entrada-iot.js';

export interface EntradaIotDTO {
  id: string;
  input: number;
  label: string;
  tipo: TipoEntradaIot;
  contexto: ContextoIot;
  funcao: FuncaoIot;
  param1: number | null;
  param2: number | null;
  param3: number | null;
  param4: number | null;
  analogicaComoDigital: boolean;
  habilitado: boolean;
}

export interface DispositivoIotDTO {
  id: string;
  serial: string;
  nome: string;
  modelo: number;
  versaoFirmware: string | null;
  ip: string | null;
  centroTrabalho: string | null;
  /**
   * Derivado do broker no momento da consulta — não é estado persistido.
   * `false` também quando o broker está inacessível.
   */
  online: boolean;
  entradas: EntradaIotDTO[];
}

function paraEntradaDTO(entrada: EntradaIot): EntradaIotDTO {
  return {
    id: entrada.idEntradaIot,
    input: entrada.input,
    label: entrada.label,
    tipo: entrada.tipo,
    contexto: entrada.contexto,
    funcao: entrada.funcao,
    param1: entrada.param1,
    param2: entrada.param2,
    param3: entrada.param3,
    param4: entrada.param4,
    analogicaComoDigital: entrada.analogicaComoDigital,
    habilitado: entrada.habilitado,
  };
}

export function paraDispositivoIotDTO(
  dispositivo: DispositivoIot,
  online: boolean,
): DispositivoIotDTO {
  return {
    id: dispositivo.idDispositivoIot,
    serial: dispositivo.serial,
    nome: dispositivo.nome,
    modelo: dispositivo.modelo,
    versaoFirmware: dispositivo.versaoFirmware,
    ip: dispositivo.ip,
    centroTrabalho: dispositivo.centroTrabalho,
    online,
    entradas: dispositivo.entradas.map(paraEntradaDTO),
  };
}
