import amqp, { type ChannelModel, type Channel } from 'amqplib';
import type {
  ConsumidorMensagensIot,
  MensagemIot,
} from '../../domain/gateways/consumidor-mensagens-iot.js';

export interface AcessoAmqp {
  host: string;
  porta: number;
  virtualHost: string;
  usuario: string;
  senha: string;
  sslHabilitado: boolean;
}

export interface OpcoesConsumidorAmqp {
  /** Fila durável onde as mensagens dos coletores são retidas. */
  fila?: string;
  /** Binding na amq.topic. */
  routingKey?: string;
  /** Mensagens não confirmadas entregues por vez (backpressure). */
  prefetch?: number;
}

const FILA_PADRAO = 'operis.iot.movimentos';
/**
 * O firmware (`visione_mqtt.hpp`) publica tudo que envia ao servidor com a
 * routing key literal "consumer" — `devices.*` é o sentido servidor→dispositivo
 * (tópicos que o firmware assina para receber comandos), não o inverso.
 */
const ROUTING_KEY_PADRAO = 'consumer';

/**
 * `type` no payload do firmware é o índice numérico do enum `EnumTipoMsgIOT`
 * (serializado como number pelo `System.Text.Json`), não a string do nome.
 * Mesma ordem de `TIPOS_MENSAGEM_IOT`.
 */
const TIPO_POR_INDICE = [
  'REGISTER',
  'REPORT',
  'MOVIMENT',
  'CONFIGURATION',
  'UPDATE',
  'UPDATESTARTED',
  'UPDATECOMPLETED',
  'UPDATEFAILED',
] as const;

/**
 * Consumidor AMQP das mensagens publicadas pelos coletores.
 *
 * Declara uma fila DURÁVEL ligada à `amq.topic`. Sem esse binding as mensagens
 * MQTT publicadas pelos dispositivos são descartadas em silêncio pelo broker —
 * exchange sem fila ligada joga a mensagem fora sem erro algum.
 *
 * A fila precisa ser durável: brokers RabbitMQ recentes recusam filas
 * transientes não-exclusivas (`transient_nonexcl_queues` está deprecado) e
 * derrubam a conexão inteira ao tentar declará-las.
 */
export class AmqpConsumidorMensagens implements ConsumidorMensagensIot {
  private conexao: ChannelModel | null = null;
  private canal: Channel | null = null;
  private encerrando = false;

  constructor(
    private readonly acesso: AcessoAmqp,
    private readonly opcoes: OpcoesConsumidorAmqp = {},
    private readonly log: (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void = () => {},
  ) {}

  private montarUri(): string {
    const protocolo = this.acesso.sslHabilitado ? 'amqps' : 'amqp';
    const usuario = encodeURIComponent(this.acesso.usuario);
    const senha = encodeURIComponent(this.acesso.senha);
    // O vhost precisa ser percent-encoded: o padrão "/" vira "%2F".
    const vhost = encodeURIComponent(this.acesso.virtualHost);
    return `${protocolo}://${usuario}:${senha}@${this.acesso.host}:${this.acesso.porta}/${vhost}`;
  }

  async consumir(handler: (mensagem: MensagemIot) => Promise<void>): Promise<void> {
    const fila = this.opcoes.fila ?? FILA_PADRAO;
    const routingKey = this.opcoes.routingKey ?? ROUTING_KEY_PADRAO;

    this.conexao = await amqp.connect(this.montarUri());
    this.canal = await this.conexao.createChannel();

    await this.canal.assertQueue(fila, { durable: true });
    await this.canal.bindQueue(fila, 'amq.topic', routingKey);
    await this.canal.prefetch(this.opcoes.prefetch ?? 20);
    this.log('info', `consumindo "${fila}" (binding ${routingKey} na amq.topic)`);

    // Reconecta sozinho: um worker de chão de fábrica não pode morrer porque
    // o broker reiniciou.
    this.conexao.on('close', () => {
      if (this.encerrando) return;
      this.log('erro', 'conexão com o broker caiu — reconectando em 5s');
      setTimeout(() => {
        void this.consumir(handler).catch((err) =>
          this.log('erro', 'falha ao reconectar', err),
        );
      }, 5_000);
    });
    this.conexao.on('error', (err) => this.log('erro', 'erro na conexão AMQP', err));

    await this.canal.consume(fila, (msg) => {
      if (!msg) return;
      void (async () => {
        try {
          await handler(this.decodificar(msg.content, msg.fields.routingKey));
          this.canal?.ack(msg);
        } catch (err) {
          this.log('erro', 'falha ao processar mensagem', err);
          // requeue: false — mensagem inválida reenfileirada vira loop infinito.
          this.canal?.nack(msg, false, false);
        }
      })();
    });
  }

  /**
   * Extrai tipo/serial/dados do payload. O firmware sempre publica com
   * routing key fixa "consumer" e traz o serial no corpo (`device_id`/`serial`);
   * o fallback pelo último segmento da routing key só cobre um binding
   * alternativo por `devices.<modelo>.<serial>`, caso um dia exista.
   */
  private decodificar(conteudo: Buffer, routingKey: string): MensagemIot {
    const texto = conteudo.toString('utf8');
    let corpo: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(texto);
      if (parsed && typeof parsed === 'object') corpo = parsed as Record<string, unknown>;
    } catch {
      // Payload não-JSON: entrega cru para o handler decidir o que fazer.
      return { tipo: 'DESCONHECIDO', serial: this.serialDaRoutingKey(routingKey), dados: texto };
    }

    // O firmware identifica o dispositivo por "device_id" (GenericMessageModel
    // do legado); "serial" é aceito também para não quebrar outras origens.
    const serialCorpo =
      typeof corpo.device_id === 'string'
        ? corpo.device_id
        : typeof corpo.serial === 'string'
          ? corpo.serial
          : undefined;
    const tipo = this.resolverTipo(corpo.type ?? corpo.tipo);

    return {
      tipo,
      serial: serialCorpo ?? this.serialDaRoutingKey(routingKey),
      dados: corpo.data ?? corpo.dados ?? corpo,
    };
  }

  /** Aceita tanto o índice numérico do firmware quanto o nome já em string. */
  private resolverTipo(valor: unknown): string {
    if (typeof valor === 'string' && valor.trim() !== '') return valor;
    if (typeof valor === 'number' && Number.isInteger(valor)) {
      return TIPO_POR_INDICE[valor] ?? 'DESCONHECIDO';
    }
    return 'DESCONHECIDO';
  }

  private serialDaRoutingKey(routingKey: string): string {
    const partes = routingKey.split('.');
    return partes[partes.length - 1] ?? '';
  }

  async encerrar(): Promise<void> {
    this.encerrando = true;
    try {
      await this.canal?.close();
    } catch {
      // canal já fechado — nada a fazer
    }
    try {
      await this.conexao?.close();
    } catch {
      // conexão já fechada — nada a fazer
    }
    this.canal = null;
    this.conexao = null;
  }
}
