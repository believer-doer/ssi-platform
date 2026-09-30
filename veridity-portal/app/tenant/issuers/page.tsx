import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { shortId } from '@/utils/formatId';
import Link from 'next/link';
import { getWorkspaceContext } from '@/lib/workspace';
import { hasCapability } from '@/lib/capabilities';

type IssuerRecord = {
  id?: string;
  issuerId?: string;
  name?: string;
  title?: string;
  status?: string;
  [key: string]: unknown;
};

export default async function IssuersPage() {
  const { jwt, tenantId } = await getSessionContext();
  const { roles } = await getWorkspaceContext();
  let data: IssuerRecord[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/issuers', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const basePath = tenantId ? `/tenant/${tenantId}` : '/tenant';
  const canWrite = hasCapability(roles, 'issuers:write');
  const issuers = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Issuers</h3>
          <p className="text-sm text-slate-500 mt-1">Manage onboarded issuer identities and kick off lifecycle actions.</p>
        </div>
        {canWrite ? (
          <Link href={`${basePath}/issuers/create`} className="btn-primary">Create Issuer</Link>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Read only</span>
        )}
      </div>
      {error !== null && error !== undefined ? <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{String(error)}</div> : null}
      {issuers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th></tr></thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {issuers.map((issuer) => {
                const idValue = issuer.id || issuer.issuerId || 'unknown';
                return (
                  <tr key={idValue} className="hover:bg-slate-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"><span className="font-mono text-xs text-slate-500">{shortId(idValue, 12, 'N/A')}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{issuer.name || issuer.title || 'unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={issuer.status === 'active' ? 'badge-active' : issuer.status === 'revoked' ? 'badge-revoked' : 'badge-pending'}>{issuer.status || 'unknown'}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><Link href={`${basePath}/issuers/${idValue}`} className="text-brand-600 font-medium hover:text-brand-800 opacity-0 group-hover:opacity-100 transition-opacity">View details →</Link></td>
                  </tr>
                );
              })}
              {issuers.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">No issuers onboarded.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
