import { getSessionContext } from '@/lib/session-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

type TrustEntity = {
  id?: string;
  name?: string;
  entityType?: string;
  registryType?: string;
  [key: string]: unknown;
};

export default async function GovernanceFrameworkAdminPage() {
  const { jwt, tenantId } = await getSessionContext();
  let data: TrustEntity[] | null = null;
  let error: unknown = null;

  try {
    // Cross-tenant trust registry query
    data = await apiFetch('/{driver}/trust-registry', 'get', { driver: 'internal', tenantId, jwt });
  } catch (err) {
    error = err;
  }

  const entities = Array.isArray(data) ? data : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-3xl font-black tracking-tight text-slate-900 italic underline decoration-indigo-500 decoration-8 underline-offset-4 uppercase">Governance Hub</h3>
          <p className="text-slate-500 font-medium mt-1">Cross-tenant proposal review and framework lifecycle control.</p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <Link 
          href="/platform-admin/governance" 
          className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
        >
          Proposals
        </Link>
        <Link 
          href="/platform-admin/governance/framework" 
          className="px-6 py-2 rounded-xl bg-white shadow-sm text-sm font-black text-slate-900 transition-all border border-slate-200"
        >
          Framework
        </Link>
      </div>

      {errorMessage ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white space-y-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Global Trust Framework</h4>
            <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Platform-Wide Governance v1.0</p>
                <p className="text-sm text-slate-500 font-medium">As a Platform Admin, you are reviewing the baseline trust rules and multi-tenant constraints for the entire ecosystem.</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Global Trust Entities</p>
              <div className="grid grid-cols-1 gap-3">
                {entities.map((item) => (
                  <div key={item.id || item.name || 'unknown'} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-mono text-[10px] font-black text-slate-400">
                        {(item.entityType || item.registryType || 'entity').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 tracking-tight">{item.name || item.id}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.id}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100">
                      ACTIVE
                    </span>
                  </div>
                ))}
                {entities.length === 0 && (
                  <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center grayscale opacity-50">
                    <p className="text-slate-400 font-black tracking-widest text-xs uppercase">No entities registered in global framework</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700" />
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 italic">Global Policies</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-xs font-bold text-slate-300 leading-relaxed">Cross-tenant schema harmonization enforcement.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-xs font-bold text-slate-300 leading-relaxed">Centralized revocation authority for platform-issued credentials.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
