import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { shortId } from '@/utils/formatId';

type SchemaRecord = {
  id?: string;
  schemaId?: string;
  name?: string;
  title?: string;
  type?: string;
  format?: string;
  [key: string]: unknown;
};

export default async function SchemasPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: SchemaRecord[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/schemas', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const schemas = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Schemas</h3>
          <p className="text-sm text-slate-500 mt-1">Discover and manage registered credential schemas.</p>
        </div>
      </div>
      
      {errorMessage ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      ) : null}
      
      {schemas.length > 0 && (
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
              {schemas.map((schema) => {
                const idValue = schema.id || schema.schemaId || 'unknown';
                return (
                  <tr key={idValue} className="hover:bg-slate-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500">{shortId(idValue, 12, 'N/A')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{schema.name || schema.title || 'unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{schema.type || schema.format || 'unknown'}</td>
                  </tr>
                );
              })}
              {schemas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No schemas found.
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
