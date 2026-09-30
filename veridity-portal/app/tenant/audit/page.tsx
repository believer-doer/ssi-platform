import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';

type AuditRecord = {
  id?: string;
  type?: string;
  status?: string;
  [key: string]: unknown;
};

export default async function AuditPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: AuditRecord[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/audit', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const audits = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Audit</h3>
      
      {errorMessage ? <div className="text-red-600">Error: {errorMessage}</div> : null}
      {audits.length > 0 && (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Type</th>
              <th className="border px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((item) => (
              <tr key={item.id}>
                <td className="border px-4 py-2">{item.id}</td>
                <td className="border px-4 py-2">{item.type}</td>
                <td className="border px-4 py-2">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
