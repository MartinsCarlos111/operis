/**
 * Porta anticorrupção para o broker de mensageria. O status online de um
 * coletor não é dado persistido: é derivado das conexões abertas no broker
 * naquele instante (o coletor se apresenta com client_id = serial).
 *
 * O módulo iot depende só desta interface — quem sabe falar com o RabbitMQ é
 * a infraestrutura, mantendo a fronteira entre features.
 */
export interface ConsultorConexoesBroker {
  /**
   * Seriais (client_ids) conectados ao broker do tenant agora. Implementações
   * devem degradar para conjunto vazio quando o broker estiver inacessível —
   * um broker fora do ar significa "ninguém online", não erro de listagem.
   */
  seriaisConectados(tenantId: string): Promise<Set<string>>;
}
