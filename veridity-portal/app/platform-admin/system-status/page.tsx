"use client";
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSessionContext } from '@/lib/hooks/useSessionContext';

type SystemStatus = Record<string, unknown>;

export default function SystemStatusPage() {
  const { jwt } = useSessionContext();
  const { data, isLoading, error } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => apiFetch<SystemStatus>('/system/status', 'get', { jwt }),
  });

  const status = data && typeof data === 'object' ? data : null;
  const errorMessage = error ? String(error) : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-3xl font-black tracking-tight text-slate-900">System Vitality</h3>
          <p className="text-slate-500 font-medium italic">Real-time health monitoring of the SSI platform core.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Monitoring
        </div>
      </div>

      {isLoading && (
        <div className="bg-white/40 backdrop-blur-md p-16 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center space-y-6 shadow-sm">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {errorMessage ? (
        <div className="p-8 rounded-[2.5rem] bg-rose-50 border-2 border-rose-100 text-rose-700 flex items-center gap-5 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-rose-400 mb-1">Status Error</p>
            <p className="text-lg font-black">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(status).map(([key, value]) => (
            <div key={key} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/40 transition-all group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 group-hover:text-brand-500 transition-colors">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
                  {typeof value === 'boolean' ? (value ? 'ACTIVE' : 'INACTIVE') : String(value)}
                </p>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <h4 className="text-xl font-black tracking-tight italic uppercase underline decoration-brand-500 decoration-4">Diagnostic Logs</h4>
            <p className="text-slate-400 text-xs font-medium max-w-lg leading-relaxed">
              Full system trace logs are being streamed to the central observability hub. Review raw telemetry for deeper troubleshooting.
            </p>
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black tracking-widest uppercase transition-all">
              Initialize Trace
            </button>
          </div>
          <div className="hidden lg:block">
            <svg className="w-32 h-32 text-white/5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14H11V21L20 10H13Z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
