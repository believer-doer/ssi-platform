import { driverRegistry } from "./registry";
import { SSIDriver } from "@ssi/core/interfaces/driver.interface";
import { logger } from "@ssi/utils";

const resolverLogger = logger.child("driver-resolver");

export function resolveDriver(type: keyof typeof driverRegistry): SSIDriver {
  const driver = driverRegistry[type];
  if (!driver) {
    resolverLogger.error("Driver lookup failed", { driver: type });
    throw new Error(`Driver '${type}' not found in registry`);
  }
  resolverLogger.debug("Resolved driver", { driver: type });
  return driver;
}
