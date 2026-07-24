import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { isAppError } from '@shared/errors/app-error.js';

/**
 * The single place where errors become HTTP responses. Expected AppErrors carry
 * their own status/code; Zod/Fastify validation errors become 400; everything
 * else is an unexpected 500 (logged, never leaked to the client).
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (isAppError(error)) {
      return reply.status(error.httpStatus).send({
        error: { code: error.code, message: error.message },
      });
    }

    // Erro de validação de entrada gerado pelo validatorCompiler do Zod.
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Falha na validação da requisição',
          details: error.validation,
        },
      });
    }

    // Uma resposta não bateu com o response schema declarado — bug nosso, 500.
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'response serialization error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }

    // ZodError cru (ex.: .parse() manual em algum ponto).
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Falha na validação da requisição',
          details: error.flatten(),
        },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.validation,
        },
      });
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
}
