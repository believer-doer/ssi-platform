import mongoose, { Schema, Document } from "mongoose";
import {
  GovernanceApproval,
  GovernanceStatus,
  GovernanceType,
} from "@ssi/core/types/governance";

export interface IGovernanceRecord extends Document {
  proposalId: string;
  tenantId?: string;
  issuerDid: string;

  governanceType: GovernanceType;

  approvals: GovernanceApproval[];

  requiredApprovals: number;

  status: GovernanceStatus;
  subjectType?: string;
  subjectId?: string;
  policyRef?: string;
  chainAnchors?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

const approvalSchema = new Schema<GovernanceApproval>(
  {
    approverDid: { type: String, required: true },
    approvedAt: { type: Date, required: true },
    signature: { type: String },
  },
  { _id: false },
);

const governanceSchema = new Schema<IGovernanceRecord>(
  {
    proposalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    tenantId: {
      type: String,
      index: true,
    },

    issuerDid: {
      type: String,
      required: true,
      index: true,
    },

    governanceType: {
      type: String,
      enum: ["admin", "multisig", "dao", "policy"],
      default: "admin",
    },

    approvals: [approvalSchema],

    requiredApprovals: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "executed", "cancelled"],
      default: "pending",
    },

    subjectType: {
      type: String,
    },

    subjectId: {
      type: String,
    },

    policyRef: {
      type: String,
    },

    chainAnchors: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

governanceSchema.index({ issuerDid: 1, status: 1 });

export default mongoose.model<IGovernanceRecord>(
  "GovernanceRecord",
  governanceSchema,
);
