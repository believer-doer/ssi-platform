import { Schema, model, Document } from "mongoose";
import type { GovernanceAnchor } from "@ssi/core/types";

export interface IAuditEventRecord extends Document {
  id: string;
  tenantId?: string;
  actorDid?: string;
  driver?: string;
  protocol?: string;
  eventType: string;
  severity: "info" | "warning" | "error" | "critical";
  subjectType?: string;
  subjectId?: string;
  action: string;
  status: "success" | "failure" | "pending";
  correlationId?: string;
  occurredAt: Date;
  details?: Record<string, unknown>;
  hash?: string;
  anchor?: GovernanceAnchor;
}

const auditEventSchema = new Schema<IAuditEventRecord>(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    actorDid: { type: String, index: true },
    driver: { type: String, index: true },
    protocol: { type: String, index: true },
    eventType: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
    },
    subjectType: { type: String },
    subjectId: { type: String, index: true },
    action: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "failure", "pending"],
      default: "success",
    },
    correlationId: { type: String, index: true },
    occurredAt: { type: Date, default: Date.now, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    hash: { type: String, index: true },
    anchor: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const AuditEventModel = model<IAuditEventRecord>(
  "AuditEvent",
  auditEventSchema,
);
