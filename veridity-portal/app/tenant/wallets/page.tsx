import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import { shortId } from '@/utils/formatId';

type WalletRecord = {
  id?: string;
  walletId?: string;
  type?: string;
  category?: string;
  status?: string;
  [key: string]: unknown;
};

export default async function WalletsPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: WalletRecord[] | null = null;
  let error: unknown = null;

  try {
    data = await apiFetch('/{driver}/wallets', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const wallets = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Wallets</h3>
          <p className="text-sm text-slate-500 mt-1">Enterprise wallets allocated within your tenant space.</p>
        </div>
      </div>
      
      {errorMessage ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      ) : null}
      
      {wallets.length > 0 && (
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
              {wallets.map((wallet) => {
                const idValue = wallet.id || wallet.walletId || 'unknown';
                return (
                  <tr key={idValue} className="hover:bg-slate-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500">{shortId(idValue, 12, 'N/A')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{wallet.type || wallet.category || 'unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={wallet.status === 'active' ? 'badge-active' : wallet.status === 'locked' ? 'badge-revoked' : 'badge-pending'}>
                        {wallet.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {wallets.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No active wallets detected.
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
