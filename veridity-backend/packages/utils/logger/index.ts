type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLevel(level: string | undefined): LogLevel {
  const normalized = (level ?? "").toLowerCase();
  switch (normalized) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return normalized as LogLevel;
    default:
      return "info";
  }
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value;
}

function shouldLog(level: LogLevel) {
  const configuredLevel = normalizeLevel(process.env.LOG_LEVEL);
  return levelPriority[level] >= levelPriority[configuredLevel];
}

function writeLog(
  level: LogLevel,
  scope: string,
  message: string,
  bindings: LogFields,
  fields?: LogFields,
) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(normalizeValue(bindings) as LogFields),
    ...(fields ? { fields: normalizeValue(fields) as LogFields } : {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export interface Logger {
  child(scope: string, bindings?: LogFields): Logger;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function createLogger(scope: string, bindings: LogFields = {}): Logger {
  return {
    child(childScope: string, childBindings: LogFields = {}) {
      return createLogger(`${scope}:${childScope}`, {
        ...bindings,
        ...childBindings,
      });
    },
    debug(message: string, fields?: LogFields) {
      writeLog("debug", scope, message, bindings, fields);
    },
    info(message: string, fields?: LogFields) {
      writeLog("info", scope, message, bindings, fields);
    },
    warn(message: string, fields?: LogFields) {
      writeLog("warn", scope, message, bindings, fields);
    },
    error(message: string, fields?: LogFields) {
      writeLog("error", scope, message, bindings, fields);
    },
  };
}

export const logger = createLogger("ssi-platform");
