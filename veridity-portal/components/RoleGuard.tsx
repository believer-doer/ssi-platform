"use client";

import { ReactNode } from "react";
import { useSessionContext } from "@/lib/hooks/useSessionContext";
import { getCapabilities, hasAnyCapability, type Capability } from "@/lib/capabilities";

type RoleGuardProps = {
  roles?: string[];
  capabilities?: Capability[];
  fallback?: ReactNode;
  children: ReactNode;
};

export function RoleGuard({ roles = [], capabilities = [], fallback, children }: RoleGuardProps) {
  const { roles: userRoles = [] } = useSessionContext();
  const allowedByRole = roles.length === 0 || roles.some((role) => userRoles.includes(role));
  const allowedByCapability = capabilities.length === 0 || hasAnyCapability(userRoles, capabilities);

  if (!allowedByRole || !allowedByCapability) {
    return fallback ?? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Read-only or unavailable for your current role.</div>;
  }

  return <>{children}</>;
}

export function CapabilityBadgeRow() {
  const { roles: userRoles = [] } = useSessionContext();
  const capabilities = Array.from(getCapabilities(userRoles)).sort();
  return (
    <div className="flex flex-wrap gap-2">
      {capabilities.map((cap) => (
        <span key={cap} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          {cap}
        </span>
      ))}
    </div>
  );
}
