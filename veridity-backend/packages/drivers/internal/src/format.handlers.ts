import { createHash } from "crypto";
import { env } from "@ssi/config";
import {
  CredentialFormatContext,
  CredentialFormatHandler,
  CredentialFormatRegistry,
} from "@ssi/core/formats";
import type {
  IssueCredentialRequest,
  IssueCredentialResult,
  VerifyCredentialRequest,
  VerifyCredentialResult,
} from "@ssi/core/types";
import { signJWT, verifyJWT } from "@ssi/core/crypto";

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function buildBaseCredential(request: IssueCredentialRequest) {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: request.issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: request.holderDid ?? request.subjectId ?? undefined,
      ...request.claims,
    },
    credentialSchema: {
      id: request.schema.id,
      type: request.schema.type ?? "JsonSchemaValidator2018",
    },
  };
}

function result(
  request: IssueCredentialRequest,
  credential: unknown,
  proofType: string,
  hash: string,
): IssueCredentialResult {
  return {
    format: request.format,
    credential,
    record: {
      id: "",
      tenantId: request.tenantId,
      format: request.format,
      schema: request.schema,
      template: request.templateId ? { id: request.templateId } : undefined,
      issuerDid: request.issuerDid,
      subjectId: request.subjectId,
      subjectData: request.claims,
      proofType,
      credential,
      hash,
      status: request.status
        ? {
            listId: request.status.listId ?? "",
            listUri: request.status.listUri,
            index: request.status.index,
            purpose: request.status.purpose ?? "revocation",
            profile: request.status.profile ?? "statuslist2021",
            status: request.status.status ?? "valid",
            updatedAt: new Date(),
          }
        : undefined,
      metadata: request.metadata,
    },
  };
}

const jwtVcHandler: CredentialFormatHandler = {
  id: "vc-jwt",
  async issue(request: IssueCredentialRequest, context: CredentialFormatContext) {
    const payload = {
      iss: request.issuerDid,
      sub: request.holderDid ?? request.subjectId,
      jti: `${request.schema.id}:${Date.now()}`,
      vc: buildBaseCredential(request),
    };
    const token = signJWT(payload, env.jwtKey || "dev-jwt-key", {
      algorithm: "HS256",
    });
    return result(request, token, "JwtProof2020", sha256(payload));
  },
  async verify(request: VerifyCredentialRequest, context: CredentialFormatContext) {
    const errors: string[] = [];
    let decoded: any;

    try {
      decoded = verifyJWT(
        String(request.credential),
        env.jwtKey || "dev-jwt-key",
      );
    } catch (error) {
      errors.push((error as Error).message);
    }

    const valid = errors.length === 0 && !!decoded?.vc?.credentialSubject;

    return {
      valid,
      format: "vc-jwt",
      checks: {
        signature: errors.length === 0,
        structure: !!decoded?.vc?.credentialSubject,
      },
      errors,
    };
  },
};

const jsonLdHandler: CredentialFormatHandler = {
  id: "vc-ldp",
  async issue(request: IssueCredentialRequest) {
    const credential = buildBaseCredential(request);
    const digest = sha256(credential);
    const proof = {
      type: request.proofType ?? "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${request.issuerDid}#keys-1`,
      proofPurpose: "assertionMethod",
      jws: signJWT({ digest }, env.jwtKey || "dev-jwt-key", {
        algorithm: "HS256",
      }),
    };

    return result(
      request,
      { ...credential, proof },
      String(proof.type),
      digest,
    );
  },
  async verify(request: VerifyCredentialRequest) {
    const vc = request.credential as any;
    const errors: string[] = [];
    const proof = vc?.proof;
    const clone = vc ? { ...vc } : {};

    if (clone && "proof" in clone) {
      delete clone.proof;
    }

    const digest = sha256(clone);
    let verifiedProof = false;

    try {
      const decoded = verifyJWT(
        proof?.jws,
        env.jwtKey || "dev-jwt-key",
      ) as { digest?: string };
      verifiedProof = decoded?.digest === digest;
    } catch (error) {
      errors.push((error as Error).message);
    }

    const valid = !!vc?.credentialSubject && !!proof && verifiedProof;

    return {
      valid,
      format: "vc-ldp",
      checks: {
        signature: verifiedProof,
        structure: !!vc?.credentialSubject && Array.isArray(vc?.type),
      },
      errors,
    };
  },
};

const sdJwtVcHandler: CredentialFormatHandler = {
  id: "sd-jwt-vc",
  async issue(request: IssueCredentialRequest) {
    const disclosures = Object.entries(request.claims).map(([key, value]) => {
      const disclosure = [key, value];
      return {
        key,
        value,
        disclosure,
        digest: sha256(disclosure),
      };
    });

    const tokenPayload = {
      iss: request.issuerDid,
      sub: request.holderDid ?? request.subjectId,
      vct: request.schema.id,
      _sd_alg: "sha-256",
      _sd: disclosures.map((entry) => entry.digest),
      cnf: request.holderDid ? { kid: `${request.holderDid}#holder` } : undefined,
    };

    const compact = signJWT(tokenPayload, env.sdJwtKey || env.jwtKey || "dev-sdjwt-key", {
      algorithm: "HS256",
    });

    return result(
      request,
      {
        compact,
        disclosures: disclosures.map((entry) => entry.disclosure),
      },
      "SdJwtVcProof",
      sha256(tokenPayload),
    );
  },
  async verify(request: VerifyCredentialRequest) {
    const credential = request.credential as any;
    const errors: string[] = [];
    let decoded: any;

    try {
      decoded = verifyJWT(
        credential?.compact ?? credential,
        env.sdJwtKey || env.jwtKey || "dev-sdjwt-key",
      );
    } catch (error) {
      errors.push((error as Error).message);
    }

    const disclosures = credential?.disclosures ?? [];
    const digests = disclosures.map((entry: unknown) => sha256(entry));
    const disclosedMatch =
      Array.isArray(decoded?._sd) &&
      digests.every((digest: string) => decoded._sd.includes(digest));
    const valid = errors.length === 0 && !!decoded?.vct && disclosedMatch;

    return {
      valid,
      format: "sd-jwt-vc",
      checks: {
        signature: errors.length === 0,
        structure: !!decoded?.vct,
        disclosure: disclosedMatch,
      },
      errors,
    };
  },
};

const bbsVcHandler: CredentialFormatHandler = {
  id: "bbs-vc",
  async issue(request: IssueCredentialRequest) {
    const credential = buildBaseCredential(request);
    const digest = sha256(credential);
    const proof = {
      type: request.proofType ?? "BbsBlsSignature2020",
      created: new Date().toISOString(),
      verificationMethod: `${request.issuerDid}#bbs-1`,
      proofPurpose: "assertionMethod",
      proofValue: signJWT(
        { digest, selectiveDisclosure: true },
        env.bbsPrivateKey || env.jwtKey || "dev-bbs-key",
        { algorithm: "HS256" },
      ),
    };

    return result(
      request,
      { ...credential, proof },
      String(proof.type),
      digest,
    );
  },
  async verify(request: VerifyCredentialRequest) {
    const vc = request.credential as any;
    const errors: string[] = [];
    const clone = vc ? { ...vc } : {};
    if (clone && "proof" in clone) {
      delete clone.proof;
    }

    const digest = sha256(clone);
    let decoded: any;

    try {
      decoded = verifyJWT(
        vc?.proof?.proofValue,
        env.bbsPrivateKey || env.jwtKey || "dev-bbs-key",
      );
    } catch (error) {
      errors.push((error as Error).message);
    }

    const valid =
      errors.length === 0 &&
      decoded?.digest === digest &&
      vc?.proof?.type === "BbsBlsSignature2020";

    return {
      valid,
      format: "bbs-vc",
      checks: {
        signature: errors.length === 0 && decoded?.digest === digest,
        structure: !!vc?.credentialSubject && !!vc?.proof,
        disclosure: true,
      },
      errors,
    };
  },
};

export function buildInternalFormatRegistry(extraHandlers: CredentialFormatHandler[] = []) {
  const registry = new CredentialFormatRegistry();
  registry.register(jwtVcHandler);
  registry.register(jsonLdHandler);
  registry.register(sdJwtVcHandler);
  registry.register(bbsVcHandler);
  for (const handler of extraHandlers) {
    registry.register(handler);
  }
  return registry;
}
