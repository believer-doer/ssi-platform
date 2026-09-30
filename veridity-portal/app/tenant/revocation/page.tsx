import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';

type RevocationListRecord = {
  id?: string;
  listId?: string;
  statusPurpose?: string;
  purpose?: string;
  status?: string;
  state?: string;
  issuerDid?: string;
  issuer?: string;
  [key: string]: unknown;
};

function getItems(payload: unknown): RevocationListRecord[] {
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object' && payload !== null && Array.isArray((payload as { items?: RevocationListRecord[] }).items)) {
    return (payload as { items: RevocationListRecord[] }).items;
  }
  return [];
}

export default async function RevocationPage() {
  const { jwt, tenantId } = await getSessionContext();
  let payload: unknown = null;
  let error: string | null = null;

  try {
    payload = await apiFetch('/revocation/lists', 'get', { tenantId, jwt });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to load revocation lists';
  }

  const items = getItems(payload);
  const errorMessage = error ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">Revocation Lists</h3>
        <p className="text-slate-500 mt-2">Aligned to the Phase 4 backend model: list-centric revocation instead of the legacy flat endpoint.</p>
      </div>

      {errorMessage ? <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3">{errorMessage}</div> : null}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4 text-left font-bold">List ID</th>
              <th className="px-5 py-4 text-left font-bold">Purpose</th>
              <th className="px-5 py-4 text-left font-bold">Status</th>
              <th className="px-5 py-4 text-left font-bold">Issuer</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-slate-500">No revocation lists returned.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id ?? item.listId} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-mono text-xs text-slate-700">{item.id ?? item.listId ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-700">{item.statusPurpose ?? item.purpose ?? 'revocation'}</td>
                  <td className="px-5 py-4 text-slate-700">{item.status ?? item.state ?? 'unknown'}</td>
                  <td className="px-5 py-4 text-slate-700">{item.issuerDid ?? item.issuer ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payload !== null && payload !== undefined ? (
        <details className="bg-slate-50 rounded-3xl border border-slate-200 p-5">
          <summary className="font-bold cursor-pointer">Raw backend response</summary>
          <pre className="mt-4 overflow-x-auto text-xs">{JSON.stringify(payload, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
