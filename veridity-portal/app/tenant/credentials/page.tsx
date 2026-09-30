import { apiFetch } from '@/lib/api';
import { getSessionContext } from '@/lib/session-context';
import Link from 'next/link';
import { getWorkspaceContext } from '@/lib/workspace';
import { hasCapability } from '@/lib/capabilities';

type CredentialRecord = {
  id?: string;
  type?: string;
  credentialType?: string;
  status?: string;
  [key: string]: unknown;
};

export default async function CredentialsPage() {
  const { jwt, tenantId } = await getSessionContext();
  const { roles } = await getWorkspaceContext();
  let data: CredentialRecord[] | null = null;
  let fetchError: string | null = null;

  try {
    data = await apiFetch('/{driver}/credentials', 'get', { driver: 'internal', tenantId, jwt });
  } catch (error) {
    fetchError = String(error);
  }

  const basePath = tenantId ? `/tenant/${tenantId}` : '/tenant';
  const canIssue = hasCapability(roles, 'credentials:write');
  const credentials = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Credentials</h3>
          <p className="text-sm text-slate-500 mt-1">Manage and review issued verifiable credentials.</p>
        </div>
        {canIssue ? (
          <Link href={`${basePath}/credentials/create`} className="btn-primary">Issue Credential</Link>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Read only</span>
        )}
      </div>
      {fetchError && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{fetchError}</div>}
      {credentials.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {credentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-slate-50 transition-colors duration-150 group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"><span className="font-mono text-xs text-slate-500">{String(cred.id || 'unknown').split('-')[0]}...</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{cred.type || cred.credentialType || 'unknown'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={cred.status === 'active' || cred.status === 'issued' ? 'badge-active' : cred.status === 'revoked' ? 'badge-revoked' : 'badge-pending'}>{cred.status || 'unknown'}</span></td>
                </tr>
              ))}
              {credentials.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">No credentials found yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
