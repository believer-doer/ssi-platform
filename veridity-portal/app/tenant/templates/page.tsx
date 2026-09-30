import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { shortId } from '@/utils/formatId';

type TemplateRecord = {
  id?: string;
  templateId?: string;
  name?: string;
  title?: string;
  schemaId?: string;
  format?: string;
  enabled?: boolean;
  active?: boolean;
  schema?: { id?: string };
  [key: string]: unknown;
};

export default async function TemplatesPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Templates</h3>
          <p className="text-sm text-slate-500 mt-1">Manage reusable templates for credential issuance.</p>
        </div>
      </div>
      
      {errorMessage ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      ) : null}
      
      {templates.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Schema</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Enabled</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {templates.map((template) => {
                const idValue = template.id || template.templateId || template.name || 'unknown';
                return (
                  <tr key={idValue} className="hover:bg-slate-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500">{shortId(idValue, 12, 'N/A')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{template.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{template.title || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{template.schemaId || (template.schema?.id ?? 'N/A')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{template.format || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{String(template.enabled ?? template.active ?? 'N/A')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-slate-500 text-sm">No templates found.</div>
      )}
    </div>
  );
}
