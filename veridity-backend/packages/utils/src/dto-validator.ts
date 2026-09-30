import "reflect-metadata";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { ValidationError, validate } from "class-validator";
import { FastifyReply } from "fastify";
import { logger } from "../logger";

const validationLogger = logger.child("validation");

function flattenErrors(errors: ValidationError[]): string {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    if (error.children && error.children.length) {
      messages.push(flattenErrors(error.children));
    }
  }

  return messages.join("; ");
}

export async function validateDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  payload: unknown,
  reply: FastifyReply,
): Promise<T | null> {
  const dto = plainToInstance(dtoClass, payload,  {
    enableImplicitConversion: true,
  }) as T;
  const validationErrors = await validate(dto as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });

  if (validationErrors.length) {
    const errorMessage = flattenErrors(validationErrors);
    validationLogger.warn("DTO validation failed", {
      dto: dtoClass.name,
      error: errorMessage,
    });
    reply.status(400).send({ error: errorMessage });
    return null;
  }

  return dto;
}

export function sendValidationError(reply: FastifyReply, error: string) {
  validationLogger.warn("Validation rejected request", { error });
  reply.status(400).send({ error });
  return null;
}
