import { apiFetch } from '@/lib/api';
import { getSessionContext } from '@/lib/session-context';
import { shortId } from '@/utils/formatId';
import Link from 'next/link';

type GovernanceProposal = {
  proposalId?: string;
  id?: string;
  governanceType?: string;
  type?: string;
  status?: string;
  state?: string;
  subjectType?: string;
  registryType?: string;
  subjectId?: string;
  entityId?: string;
  [key: string]: unknown;
};

export default async function GovernanceAdminPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: GovernanceProposal[] | null = null;
  let error: unknown = null;

  try {
    // Platform admin query for governance proposals
    data = await apiFetch('/{driver}/governance/proposals', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const governanceItems = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 italic underline decoration-indigo-500 decoration-8 underline-offset-4 uppercase">Governance Hub</h3>
          <p className="text-slate-500 font-medium mt-1">Cross-tenant proposal review and framework lifecycle control.</p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <Link 
          href="/platform-admin/governance" 
          className="px-6 py-2 rounded-xl bg-white shadow-sm text-sm font-black text-slate-900 transition-all border border-slate-200"
        >
          Proposals
        </Link>
        <Link 
          href="/platform-admin/governance/framework" 
          className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
        >
          Framework
        </Link>
      </div>
      
      {errorMessage && (
        <div className="p-6 rounded-[2rem] bg-rose-50 border-2 border-rose-100 text-rose-700 shadow-xl shadow-rose-200/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="font-black uppercase tracking-widest text-[10px] text-rose-400 mb-0.5">Network Failure</p>
            <p className="font-bold">{errorMessage}</p>
          </div>
        </div>
      )}
      
      {governanceItems.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden relative group">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Proposal ID</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Governance Type</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject Type</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {governanceItems.map((item) => {
                const proposalId = item.proposalId || item.id || 'unknown';
                return (
                  <tr key={proposalId} className="hover:bg-slate-50 transition-all duration-300 group/row">
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-black text-slate-800 tracking-tight">
                      <span className="font-mono text-xs font-bold text-slate-400 group-hover/row:text-brand-600 transition-colors">
                        {shortId(proposalId, 12, 'N/A')}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-black text-slate-800 tracking-tight">
                      {item.governanceType || item.type || 'unknown'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-600">
                      {item.status || item.state || 'unknown'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-600">
                      {item.subjectType || item.registryType || 'unknown'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-600">
                      {item.subjectId || item.entityId || 'unknown'}
                    </td>
                  </tr>
                );
              })}
              {(!Array.isArray(data) || data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-6 grayscale opacity-40">
                      <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-dashed animate-spin duration-[10s]" />
                      <p className="text-slate-400 font-black tracking-[0.3em] uppercase text-xs">No proposals detected</p>
                    </div>
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
