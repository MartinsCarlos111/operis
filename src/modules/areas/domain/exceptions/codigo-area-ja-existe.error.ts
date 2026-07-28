import { AppError } from '@shared/errors/app-error.js';

/** Paridade com AreaRN.AdicionarArea: "Área com o código X já cadastrada." */
export class CodigoAreaJaExisteError extends AppError {
  readonly code = 'CODIGO_AREA_JA_EXISTE';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Área com o código '${codigo}' já cadastrada.`);
  }
}
