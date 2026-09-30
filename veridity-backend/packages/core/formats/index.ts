import type {
  CredentialFormatProfile,
  IssueCredentialRequest,
  IssueCredentialResult,
  PresentationRequest,
  PresentationRecord,
  VerifyCredentialRequest,
  VerifyCredentialResult,
  VerifyPresentationRequest,
  VerifyPresentationResult,
} from "../types";

export interface CredentialFormatContext {
  driver: string;
  issuerDid?: string;
  holderDid?: string;
  verifierDid?: string;
  tenantId?: string;
  keyRef?: string;
}

export interface CredentialFormatHandler {
  id: CredentialFormatProfile;
  aliases?: string[];
  issue(
    request: IssueCredentialRequest,
    context: CredentialFormatContext,
  ): Promise<IssueCredentialResult>;
  verify(
    request: VerifyCredentialRequest,
    context: CredentialFormatContext,
  ): Promise<VerifyCredentialResult>;
  createPresentation?(
    request: PresentationRequest,
    context: CredentialFormatContext,
  ): Promise<PresentationRecord>;
  verifyPresentation?(
    request: VerifyPresentationRequest,
    context: CredentialFormatContext,
  ): Promise<VerifyPresentationResult>;
}

export class CredentialFormatRegistry {
  private readonly handlers = new Map<CredentialFormatProfile, CredentialFormatHandler>();

  register(handler: CredentialFormatHandler) {
    this.handlers.set(handler.id, handler);
  }

  get(profile: CredentialFormatProfile) {
    return this.handlers.get(profile) ?? null;
  }

  supports(profile: CredentialFormatProfile) {
    return this.handlers.has(profile);
  }

  list() {
    return Array.from(this.handlers.values());
  }
}

export const DEFAULT_CREDENTIAL_FORMAT_PROFILES: CredentialFormatProfile[] = [
  "vc-jwt",
  "vc-ldp",
  "sd-jwt-vc",
  "bbs-vc",
  "anoncreds",
  "iso-mdoc",
];
