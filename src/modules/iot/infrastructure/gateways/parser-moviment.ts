import type { MensagemIot, MovimentoRecebido } from '../../domain/gateways/consumidor-mensagens-iot.js';
import type { PayloadRegisterIot } from '../../application/use-cases/registrar-dispositivo-iot.use-case.js';

/**
 * Traduz o payload MOVIMENT do firmware para o vocabulário do domínio.
 *
 * Migrado de Octopus `MovimentIOT` (Input, Context, Value, Serial, OccurredOn).
 * Aceita tanto o formato do legado (PascalCase) quanto camelCase/snake_case,
 * e tanto um objeto único quanto um array — o firmware pode agrupar leituras
 * num só envio, e o formato exato ainda não foi observado em produção.
 *
 * Mensagens que não são MOVIMENT retornam lista vazia: REGISTER/REPORT/UPDATE
 * são controle e não geram leitura.
 */
export function extrairMovimentos(mensagem: MensagemIot): MovimentoRecebido[] {
  if (mensagem.tipo !== 'MOVIMENT') return [];

  const bruto = mensagem.dados;
  const itens: unknown[] = Array.isArray(bruto) ? bruto : [bruto];

  const movimentos: MovimentoRecebido[] = [];
  for (const item of itens) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;

    const inputFirmware = numero(o.input ?? o.Input);
    const valor = numero(o.value ?? o.Value ?? o.valor);
    const contexto = numero(o.context ?? o.Context ?? o.contexto);
    if (inputFirmware === null) continue;

    movimentos.push({
      serial: texto(o.serial ?? o.Serial) ?? mensagem.serial,
      // O firmware indexa `digital_input_conf[]` a partir de 0 (DI1 = 0) ao
      // montar o MOVIMENT das portas digitais
      // (`create_payload_of_digital_input(0..3)`), mas a configuração que ele
      // mesmo recebe usa chaves 1-based (`input_1` = DI1) — mesma convenção
      // de `EntradaIot.input` no domínio ("DI1 = 1"). Sem essa soma, o pulso
      // de uma porta física é gravado sob a configuração da porta anterior
      // (ex.: pulsos da DI2 caindo na config da DI1) e a última porta
      // configurada nunca recebe leitura nenhuma. A porta analógica já sai
      // do firmware com `input: 5` fixo (`create_payload_of_analog_input`),
      // já na convenção 1-based (AI1 = porta 5) — não soma.
      input: inputFirmware === 5 ? inputFirmware : inputFirmware + 1,
      contexto: contexto ?? 0,
      // Pulso de contador costuma vir sem valor: cada evento conta 1.
      valor: valor ?? 1,
      ocorridoEm: data(o.occurredOn ?? o.OccurredOn ?? o.timestamp ?? o.ocorridoEm),
    });
  }
  return movimentos;
}

/**
 * Traduz o payload REGISTER do firmware (paridade com `RegisterModel`:
 * model, version, ip). Tudo opcional exceto `version`: o firmware sempre
 * reporta a versão atual; modelo e ip vêm quando o hardware repassa.
 */
export function extrairRegisterPayload(mensagem: MensagemIot): PayloadRegisterIot {
  const o = (mensagem.dados ?? {}) as Record<string, unknown>;
  const model = o.model ?? o.Model ?? o.modelo;
  const version = texto(o.version ?? o.Version ?? o.versao) ?? '';
  const ip = texto(o.ip ?? o.Ip ?? o.IP);
  return {
    model: model !== undefined && model !== null ? (typeof model === 'number' ? model : Number(model)) : 0,
    version,
    ip: ip ?? undefined,
  };
}

function numero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/**
 * O firmware envia `timestamp` como "d/M/yyyy H:mm:ss" (`CustomDateTimeConverter`
 * do legado, sem zero-padding) — formato que `new Date(string)` não interpreta
 * de forma confiável entre engines JS. Tentamos esse formato explicitamente
 * antes de cair no parser nativo (ISO 8601 e afins).
 */
const TIMESTAMP_FIRMWARE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/;

/**
 * Sem instante no payload, usa a hora de recepção. Um dado com timestamp
 * aproximado vale mais que um dado descartado — mas é o motivo de
 * `registradoEm` existir separado de `ocorridoEm`.
 */
function data(v: unknown): Date {
  if (typeof v === 'string') {
    const m = TIMESTAMP_FIRMWARE.exec(v.trim());
    if (m) {
      const [, dia, mes, ano, hora, minuto, segundo] = m;
      const d = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
