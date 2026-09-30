import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { SimpleTable } from '@/components/SimpleTable';

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

export default async function TrustRegistryAdminPage() {
  const { jwt, tenantId } = await getSessionContext();
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
    <div>
      <h3 className="text-xl font-bold mb-4">Trust Registry</h3>
      
      {errorMessage ? <div className="text-red-600">Error: {errorMessage}</div> : null}
      {entities.length > 0 && (
        <SimpleTable columns={Object.keys(entities[0])} data={entities} />
      )}
      {entities.length === 0 && data && (
        <div>No trust registry entries found.</div>
      )}
    </div>
  );
}
