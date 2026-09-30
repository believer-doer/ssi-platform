import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';

type PresentationRecord = {
  id?: string;
  presentationId?: string;
  protocol?: string;
  format?: string;
  state?: string;
  status?: string;
  [key: string]: unknown;
};

export default async function PresentationsPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: PresentationRecord[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/presentations', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const presentations = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';


  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Presentations</h3>
      
      {errorMessage ? <div className="text-red-600">Error: {errorMessage}</div> : null}
      {presentations.length > 0 && (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Protocol</th>
              <th className="border px-4 py-2">State</th>
            </tr>
          </thead>
          <tbody>
            {presentations.map((item, index) => {
              const idValue = item.id || item.presentationId || `presentation-${index}`;
              return (
                <tr key={idValue}>
                  <td className="border px-4 py-2">{idValue}</td>
                  <td className="border px-4 py-2">{item.protocol || item.format || 'unknown'}</td>
                  <td className="border px-4 py-2">{item.state || item.status || 'unknown'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
