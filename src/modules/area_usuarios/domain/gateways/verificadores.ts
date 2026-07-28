/**
 * Portas anticorrupção para os contextos de áreas e usuários. O AreaUsuarioRN
 * exige que ambos existam antes de vincular; este módulo confere isso sem
 * importar os internals dos outros (fronteira entre features).
 */
export interface VerificadorArea {
  existe(areaId: string): Promise<boolean>;
}

export interface VerificadorUsuario {
  existe(usuarioId: string): Promise<boolean>;
}
