import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';

type TemplateRecord = {
  id?: string;
  name?: string;
  title?: string;
  schemaId?: string;
  format?: string;
  enabled?: boolean;
  active?: boolean;
  schema?: { id?: string };
  [key: string]: unknown;
};

export default async function TemplatesAdminPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: TemplateRecord[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/templates', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const templates = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Credential Templates</h3>
      {errorMessage ? <div className="text-red-600">Error: {errorMessage}</div> : null}

      {templates.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Schema ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Enabled</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {templates.map((template, index) => (
                <tr key={template.id ?? template.name ?? index} className="hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{template.id || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{template.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{template.title || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{template.schemaId || (template.schema?.id ?? 'N/A')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{template.format || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{String(template.enabled ?? template.active ?? 'N/A')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-slate-500">No credential templates found.</div>
      )}
    </div>
  );
}
