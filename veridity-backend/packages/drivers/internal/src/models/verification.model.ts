import mongoose, { Schema, Document } from "mongoose";

export interface IVerification extends Document {
  vc: Record<string, unknown>;
  verified: boolean;
}

const verificationSchema = new Schema<IVerification>(
  {
    vc: { type: Object, required: true },
    verified: { type: Boolean, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IVerification>(
  "Verification",
  verificationSchema,
);
