import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { SimpleTable } from '@/components/SimpleTable';

export default async function SchemasAdminPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: Array<Record<string, unknown>> | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/schemas', 'get', { driver: 'internal', tenantId, jwt });
  } catch(err) {
    error = err;
  }


  const schemas = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Schemas</h3>
      
      {errorMessage ? <div className="text-red-600">Error: {errorMessage}</div> : null}
      {schemas.length > 0 && (
        <SimpleTable columns={Object.keys(schemas[0] ?? {})} data={schemas} />
      )}
      {schemas.length === 0 && (
        <div>No schemas found.</div>
      )}
    </div>
  );
}
