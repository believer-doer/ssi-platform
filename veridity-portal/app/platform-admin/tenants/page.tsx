"use client";
import Link from 'next/link';
import { useTenants } from '@/lib/hooks/useTenants';
import { useSessionContext } from '@/lib/hooks/useSessionContext';

type TenantRecord = {
  id?: string;
  name?: string;
  driver?: string;
  [key: string]: unknown;
};

export default function TenantsPage() {
  const { jwt } = useSessionContext();
  const { data, isLoading, error } = useTenants(jwt);
  const tenants = Array.isArray(data) ? (data as TenantRecord[]) : [];
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black tracking-tight text-slate-900">Tenant Management</h3>
          <p className="text-slate-500 font-medium mt-1">Global registry of active tenants and their allocated drivers.</p>
        </div>
        <Link 
          href="/platform-admin/tenants/create"
          className="btn-primary px-6 py-2.5 rounded-2xl font-bold text-sm shadow-xl shadow-brand-500/20 active:scale-95 transition-all inline-block"
        >
          Provision Tenant
        </Link>
      </div>

      {isLoading && (
        <div className="bg-white/40 backdrop-blur-md p-16 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Loading Registry...</p>
        </div>
      )}

      {errorMessage ? (
        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-100 text-rose-700 flex items-center gap-4 shadow-lg shadow-rose-200/20">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="font-black uppercase tracking-wider text-xs">Registry Error</p>
            <p className="text-sm font-semibold opacity-80">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {tenants.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden relative group">
          <table className="min-w-full divide-y divide-slate-100 relative z-10">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resource ID</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tenant Name</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Driver Association</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-brand-50/30 transition-colors duration-300 group/row">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-slate-400 group-hover/row:text-brand-600 transition-colors">{tenant.id}</span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-black text-slate-800 tracking-tight">{tenant.name}</td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-500 group-hover/row:bg-brand-100 group-hover/row:text-brand-700 group-hover/row:border-brand-200 transition-all">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/row:bg-brand-500 animate-pulse" />
                      {tenant.driver?.toUpperCase() || 'INTERNAL'}
                    </span>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 italic font-black text-4xl">?</div>
                      <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">No tenants discovered</p>
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
