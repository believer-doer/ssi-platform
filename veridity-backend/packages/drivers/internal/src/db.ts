import mongoose from "mongoose";
import { logger } from "@ssi/utils";

const dbLogger = logger.child("db", { provider: "mongodb" });

const connectionStates: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export async function connectDB(uri: string) {
  mongoose.set("bufferCommands", false);
  dbLogger.info("Connecting to MongoDB");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  dbLogger.info("MongoDB connection established");
}

export const disconnectDB = async () => {
  await mongoose.disconnect();
  dbLogger.info("MongoDB connection closed");
};

export function getDatabaseStatus() {
  const { connection } = mongoose;
  const state = connection.readyState;

  return {
    ok: state === 1,
    state,
    label: connectionStates[state] ?? "unknown",
    host: connection.host || undefined,
    name: connection.name || undefined,
  };
}
