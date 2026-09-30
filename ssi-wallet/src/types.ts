export type CredentialStatus = "valid" | "expired" | "revoked";

export interface CredentialClaim {
  label: string;
  value: string;
  selective?: boolean;
}

export interface WalletCredential {
  id: string;
  title: string;
  issuer: string;
  category: string;
  format: "JWT VC" | "SD-JWT VC";
  status: CredentialStatus;
  issuedAt: string;
  expiresAt: string;
  trusted: boolean;
  claims: CredentialClaim[];
}

export interface WalletActivity {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  kind: "issue" | "present" | "verify" | "trust";
}

export interface PresentationRequest {
  verifier: string;
  purpose: string;
  sessionId: string;
  expiresIn: string;
  trustLabel: string;
  requestedClaims: string[];
}

export interface WalletStats {
  credentialCount: number;
  trustedIssuers: number;
  presentations: number;
  secureState: string;
}
