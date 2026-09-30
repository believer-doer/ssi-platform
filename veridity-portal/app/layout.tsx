import "./globals.css";
import { Providers } from "@/components/Providers";
import { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Fingerprint, Search, ShieldCheck, FileCheck, Layers, Landmark, Network, Gavel, RadioTower, ScrollText, KeyRound, BadgeCheck, Waypoints } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace";
import { LogoutButton } from "@/components/LogoutButton";
import { hasCapability, roleLabel } from "@/lib/capabilities";
import Image from "next/image";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { jwt, roles, tenantId, baseTenantPath, isPlatformAdmin, primaryRole } = await getWorkspaceContext();

  if (!jwt) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>
          <Providers>{children}</Providers>
        </body>
      </html>
    );
  }

  const can = (capability: Parameters<typeof hasCapability>[1]) => hasCapability(roles, capability);
  const navSections = [
    {
      title: "Workspace",
      show: can('tenant:view') || isPlatformAdmin,
      items: [
        { href: `${baseTenantPath}/dashboard`, label: 'Dashboard', icon: LayoutDashboard, show: true },
        { href: `${baseTenantPath}/credentials`, label: 'Credentials', icon: FileCheck, show: can('credentials:read') },
        { href: `${baseTenantPath}/issuers`, label: 'Issuers', icon: ShieldCheck, show: can('issuers:read') },
        { href: `${baseTenantPath}/verifiers`, label: 'Verifiers', icon: Search, show: can('verifiers:read') },
        { href: `${baseTenantPath}/wallets`, label: 'Wallets', icon: Fingerprint, show: can('wallets:read') },
        { href: `${baseTenantPath}/schemas`, label: 'Schemas', icon: Layers, show: can('schemas:read') },
        { href: `${baseTenantPath}/templates`, label: 'Templates', icon: ScrollText, show: can('templates:read') },
      ]
    },
    {
      title: "Protocol Operations",
      show: can('protocols:view'),
      items: [
        { href: `${baseTenantPath}/protocols`, label: 'Protocols', icon: RadioTower, show: true },
        { href: `${baseTenantPath}/protocols/oidc4vci`, label: 'OIDC4VCI', icon: KeyRound, show: can('protocols:oidc4vci') },
        { href: `${baseTenantPath}/protocols/oidc4vp`, label: 'OIDC4VP', icon: Waypoints, show: can('protocols:oidc4vp') },
        { href: `${baseTenantPath}/presentations`, label: 'Presentations', icon: BadgeCheck, show: can('presentations:read') },
        { href: `${baseTenantPath}/revocation`, label: 'Revocation', icon: KeyRound, show: can('revocation:read') },
        { href: `${baseTenantPath}/audit`, label: 'Audit', icon: ScrollText, show: can('audit:read') },
      ]
    },
    {
      title: "Policy & Trust",
      show: can('trust:read') || can('governance:read'),
      items: [
        { href: `${baseTenantPath}/trust`, label: 'Trust Registry', icon: Network, show: can('trust:read') },
        { href: `${baseTenantPath}/governance`, label: 'Governance', icon: Gavel, show: can('governance:read') },
      ]
    },
    {
      title: "Global Operations",
      show: isPlatformAdmin,
      items: [
        { href: '/platform-admin/tenants', label: 'Tenants', icon: Landmark, show: true },
        { href: '/platform-admin/tenant-policies', label: 'Tenant Policies', icon: ScrollText, show: true },
        { href: '/platform-admin/driver-readiness', label: 'Driver Readiness', icon: Network, show: true },
        { href: '/platform-admin/governance', label: 'Governance', icon: Gavel, show: true },
      ]
    },
  ];

  const workspaceLabel = isPlatformAdmin ? 'Platform + Tenant Ops' : roleLabel(primaryRole);
  const headerLabel = isPlatformAdmin ? 'Operations Portal' : roleLabel(primaryRole);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex" suppressHydrationWarning>
        <Providers>
          <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
            <div className="h-20 flex items-center px-8 border-b border-slate-100">
              {/* <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-200">
                <Hexagon className="w-6 h-6 fill-white/20" />
              </div>
              <span className="font-black text-xl tracking-tight italic text-slate-900">VERIDITY</span> */}
              <Image src="/assets/veridity-logo.svg" alt="Veridity Logo" width={128} height={32} className="w-32" />
            </div>
            <div className="px-6 pt-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Active workspace</div>
                <div className="mt-2 text-sm font-black text-slate-900">{workspaceLabel}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">tenant={tenantId ?? 'n/a'}</div>
                <div className="mt-2 flex flex-wrap gap-2">{roles.map((role) => <span key={role} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 border border-slate-200">{role}</span>)}</div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {navSections.filter(section => section.show).map((section) => (
                <div key={section.title}>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">{section.title}</div>
                  <div className="space-y-1">
                    {section.items.filter(item => item.show).map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} className="flex items-center px-4 py-3 text-sm font-bold rounded-2xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all gap-3 group">
                        <Icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" /> {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-br from-indigo-50/50 to-transparent -z-10" />
            <header className="h-20 bg-white/70 backdrop-blur-3xl border-b border-slate-100 flex items-center justify-between px-12 z-20 sticky top-0">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-black text-slate-900 tracking-tight italic uppercase underline decoration-indigo-500 decoration-4 underline-offset-4">{headerLabel}</h1>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Driver</div>
                  <div className="text-sm font-bold text-slate-700">internal</div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <LogoutButton />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-12 animate-in fade-in slide-in-from-bottom-6 duration-700">{children}</div>
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
