export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export type Metadata = Record<string, unknown>;

export type RegistryType = "internal" | "blockchain" | "hybrid";

export type RecordStatus =
  | "draft"
  | "pending"
  | "active"
  | "suspended"
  | "revoked"
  | "archived";

export interface EntityTimestamps {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total?: number;
}
