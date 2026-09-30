import type { EntityTimestamps, Metadata } from "./common";
import type { GovernanceAnchor } from "./governance";
import type { ProtocolProfile } from "./protocol";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export type AuditEventType =
  | "tenant.created"
  | "issuer.onboarded"
  | "verifier.onboarded"
  | "wallet.onboarded"
  | "schema.registered"
  | "template.registered"
  | "credential.issued"
  | "credential.verified"
  | "presentation.created"
  | "presentation.verified"
  | "status.updated"
  | "trust.entry.updated"
  | "governance.proposal.created"
  | "governance.proposal.approved"
  | "protocol.session.updated";

export interface AuditEventRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  actorDid?: string;
  driver?: string;
  protocol?: ProtocolProfile;
  eventType: AuditEventType;
  severity: AuditSeverity;
  subjectType?: string;
  subjectId?: string;
  action: string;
  status: "success" | "failure" | "pending";
  correlationId?: string;
  occurredAt: Date;
  details?: Metadata;
  hash?: string;
  anchor?: GovernanceAnchor;
}
