import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { shortId } from '@/utils/formatId';

type TrustEntity = {
  id?: string;
  registryId?: string;
  identifier?: string;
  name?: string;
  title?: string;
  entityType?: string;
  registryType?: string;
  type?: string;
  [key: string]: unknown;
};

export default async function TrustPage() {
  const { jwt, tenantId, roles } = await getSessionContext();

  if (!roles.some(r => ['tenant-admin', 'platform-admin'].includes(r))) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center rounded-xl border border-rose-100 bg-rose-50 p-12">
          <h3 className="text-2xl font-bold text-rose-700">Access Denied</h3>
          <p className="mt-2 text-sm text-rose-600">Trust registry is only available to tenant-admin or platform-admin users.</p>
        </div>
      </div>
    );
  }

  let data: TrustEntity[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/trust-registry', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const entities = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Trust Registry</h3>
          <p className="text-sm text-slate-500 mt-1">Entities registered in the active trust ecosystem.</p>
        </div>
      </div>
      
      {errorMessage ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      ) : null}
      
      {entities.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {entities.map((item) => {
                const id = item.id || item.registryId || item.identifier || 'unknown';
                const displayId = shortId(id, 12, 'N/A');
                return (
                  <tr key={id} className="hover:bg-slate-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500">{displayId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{item.name || item.title || 'unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge-pending">{item.entityType || item.registryType || item.type || 'unknown'}</span>
                    </td>
                  </tr>
                );
              })}
              {entities.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">
                    Trust ecosystem is currently empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
