export type PortalRole =
  | 'platform-admin'
  | 'tenant-admin'
  | 'issuer'
  | 'verifier'
  | 'wallet'
  | 'auditor'
  | 'worker';

export type Capability =
  | 'platform:view'
  | 'tenant:view'
  | 'tenant:admin'
  | 'issuers:read'
  | 'issuers:write'
  | 'credentials:read'
  | 'credentials:write'
  | 'verifiers:read'
  | 'verifiers:write'
  | 'wallets:read'
  | 'wallets:write'
  | 'schemas:read'
  | 'schemas:write'
  | 'templates:read'
  | 'templates:write'
  | 'trust:read'
  | 'trust:write'
  | 'governance:read'
  | 'governance:write'
  | 'audit:read'
  | 'revocation:read'
  | 'revocation:write'
  | 'presentations:read'
  | 'presentations:write'
  | 'protocols:view'
  | 'protocols:oidc4vci'
  | 'protocols:oidc4vp'
  | 'worker:ops';

const ROLE_CAPABILITIES: Record<PortalRole, Capability[]> = {
  'platform-admin': [
    'platform:view', 'tenant:view', 'tenant:admin',
    'issuers:read', 'issuers:write',
    'credentials:read', 'credentials:write',
    'verifiers:read', 'verifiers:write',
    'wallets:read', 'wallets:write',
    'schemas:read', 'schemas:write',
    'templates:read', 'templates:write',
    'trust:read', 'trust:write',
    'governance:read', 'governance:write',
    'audit:read',
    'revocation:read', 'revocation:write',
    'presentations:read', 'presentations:write',
    'protocols:view', 'protocols:oidc4vci', 'protocols:oidc4vp',
    'worker:ops',
  ],
  'tenant-admin': [
    'tenant:view', 'tenant:admin',
    'issuers:read', 'issuers:write',
    'credentials:read', 'credentials:write',
    'verifiers:read', 'verifiers:write',
    'wallets:read', 'wallets:write',
    'schemas:read', 'schemas:write',
    'templates:read', 'templates:write',
    'trust:read', 'trust:write',
    'governance:read', 'governance:write',
    'audit:read',
    'revocation:read', 'revocation:write',
    'presentations:read', 'presentations:write',
    'protocols:view', 'protocols:oidc4vci', 'protocols:oidc4vp',
  ],
  issuer: [
    'tenant:view',
    'credentials:read', 'credentials:write',
    'schemas:read', 'schemas:write',
    'templates:read', 'templates:write',
    'revocation:read', 'revocation:write',
    'protocols:view', 'protocols:oidc4vci',
  ],
  verifier: [
    'tenant:view',
    'schemas:read',
    'presentations:read', 'presentations:write',
    'protocols:view', 'protocols:oidc4vp',
  ],
  wallet: [
    'tenant:view',
    'wallets:read',
    'presentations:read', 'presentations:write',
  ],
  auditor: [
    'tenant:view',
    'issuers:read', 'credentials:read', 'verifiers:read', 'wallets:read',
    'schemas:read', 'templates:read',
    'trust:read', 'governance:read', 'audit:read', 'revocation:read', 'presentations:read',
    'protocols:view', 'protocols:oidc4vci', 'protocols:oidc4vp',
  ],
  worker: ['worker:ops'],
};

export const ROLE_PRIORITY: PortalRole[] = [
  'platform-admin',
  'tenant-admin',
  'issuer',
  'verifier',
  'wallet',
  'auditor',
  'worker',
];

export function normalizeRoles(roles: string[]): PortalRole[] {
  return roles.filter((role): role is PortalRole => ROLE_PRIORITY.includes(role as PortalRole));
}

export function getPrimaryRole(roles: string[]): PortalRole | null {
  const normalized = normalizeRoles(roles);
  return ROLE_PRIORITY.find((role) => normalized.includes(role)) ?? null;
}

export function getCapabilities(roles: string[]) {
  const caps = new Set<Capability>();
  for (const role of normalizeRoles(roles)) {
    for (const capability of ROLE_CAPABILITIES[role]) caps.add(capability);
  }
  return caps;
}

export function hasCapability(roles: string[], capability: Capability) {
  return getCapabilities(roles).has(capability);
}

export function hasAnyCapability(roles: string[], capabilities: Capability[]) {
  const set = getCapabilities(roles);
  return capabilities.some((cap) => set.has(cap));
}

export function roleLabel(role: PortalRole | null) {
  switch (role) {
    case 'platform-admin': return 'Platform Administrator';
    case 'tenant-admin': return 'Tenant Administrator';
    case 'issuer': return 'Issuer Operator';
    case 'verifier': return 'Verifier Operator';
    case 'wallet': return 'Wallet Operator';
    case 'auditor': return 'Auditor';
    case 'worker': return 'Worker';
    default: return 'Unknown Role';
  }
}
