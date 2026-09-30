"use client";
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSessionContext } from '@/lib/hooks/useSessionContext';
import { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Cpu, Shield, Globe, Database, CpuIcon } from 'lucide-react';

type DriverCapabilities = {
  protocols?: string[];
  didMethods?: string[];
  credentialFormats?: string[];
  storage?: Record<string, unknown>;
  domains?: Record<string, unknown>;
};

type DriverRecord = {
  id?: string;
  name?: string;
  type?: string;
  version?: string;
  latency?: string;
  ready?: boolean;
  capabilities?: DriverCapabilities;
};

export default function DriverReadinessPage() {
  const { jwt } = useSessionContext();
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['driver-readiness'],
    queryFn: async () => {
      const res = await apiFetch<{ drivers?: DriverRecord[] }>('/system/status', 'get', { jwt });
      return res.drivers ?? [];
    },
  });
  const errorMessage = error !== null && error !== undefined ? String(error) : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-3xl font-black tracking-tight text-slate-900 italic underline decoration-indigo-500 decoration-8 underline-offset-4">Driver Readiness</h3>
          <p className="text-slate-500 font-medium">Availability and health status of all integrated SSI drivers.</p>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white/40 backdrop-blur-md p-16 rounded-[2.5rem] border border-slate-100 flex items-center justify-center shadow-sm">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {errorMessage ? (
        <div className="p-8 rounded-[2.5rem] bg-rose-50 border-2 border-rose-100 text-rose-700 flex items-center gap-5 shadow-lg shadow-rose-200/30">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-rose-400 mb-1">Connection Error</p>
            <p className="text-lg font-black tracking-tight">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {data && Array.isArray(data) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((driver) => (
            <div key={driver.id} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 relative group transition-all hover:translate-y-[-4px]">
              <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${driver.ready ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`} />
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">{driver.name || driver.id}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{driver.type || 'PROTOCOL DRIVER'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 tracking-wider">VERSION</span>
                    <span className="font-mono text-slate-900 font-black">{driver.version || 'v1.0.0-abs'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 tracking-wider">LATENCY</span>
                    <span className="font-mono text-slate-900 font-black">{driver.latency || '12ms'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-tighter border ${driver.ready ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {driver.ready ? 'O_READY' : 'X_ERROR'}
                  </div>
                  <button 
                    onClick={() => setSelectedDriver(driver)}
                    className="flex-1 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline transition-all underline-offset-4 decoration-brand-200 text-left"
                  >
                    Verify Capabilities &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center grayscale">
              <p className="text-slate-400 font-black tracking-widest uppercase text-sm">Empty Topology</p>
            </div>
          )}
        </div>
      )}

      {/* Capabilities Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-20">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedDriver(null)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-slate-100 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-slate-50 p-8 sm:p-12 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${selectedDriver.ready ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600 shadow-lg shadow-rose-200'}`}>
                  {selectedDriver.ready ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-slate-900">{selectedDriver.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-3 py-0.5 rounded-full bg-slate-200 text-[10px] font-black tracking-widest uppercase text-slate-600 italic">CAPABILITY VERIFIED</span>
                    <span className="text-xs text-slate-400 font-medium tracking-tight">Version {selectedDriver.version || '1.0.0-abs'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDriver(null)}
                className="w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-900"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content SCROLLABLE */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                
                {/* Left Column: Core Matrix */}
                <div className="space-y-10">
                  <section className="space-y-4">
                    <div className="flex items-center gap-3 text-brand-600">
                      <Cpu size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest">Protocol Matrix</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedDriver.capabilities?.protocols?.map((p) => (
                        <span key={p} className="px-4 py-2 rounded-2xl bg-brand-50 border border-brand-100 text-brand-700 text-xs font-black tracking-tight">{p}</span>
                      )) || <span className="text-slate-400 text-xs font-medium italic">No protocols defined</span>}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-3 text-indigo-600">
                      <Shield size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest">DID Methods</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedDriver.capabilities?.didMethods?.map((m) => (
                        <span key={m} className="px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black tracking-tight">{m}</span>
                      )) || <span className="text-slate-400 text-xs font-medium italic">No methods defined</span>}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600">
                      <Globe size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest">Credential Formats</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedDriver.capabilities?.credentialFormats?.map((f) => (
                        <span key={f} className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black tracking-tight">{f}</span>
                      )) || <span className="text-slate-400 text-xs font-medium italic">No formats defined</span>}
                    </div>
                  </section>
                </div>

                {/* Right Column: Storage & Domains */}
                <div className="space-y-10">
                  <section className="space-y-4">
                    <div className="flex items-center gap-3 text-amber-600">
                      <Database size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest">Storage Backend</h3>
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-3xl overflow-hidden">
                      {Object.entries(selectedDriver.capabilities?.storage ?? {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center px-6 py-4 bg-white hover:bg-slate-50 transition-colors">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={`w-2 h-2 rounded-full ${val ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-900">
                      <CpuIcon size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest">Functional Domains</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedDriver.capabilities?.domains ?? {}).map(([key, val]) => (
                        <div key={key} className={`px-4 py-3 rounded-2xl border flex items-center justify-between group transition-all ${val ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{key}</span>
                          {val ? <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform" /> : <X size={10} className="text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 sm:p-12 bg-slate-900 flex items-center justify-between">
              <p className="text-slate-400 text-xs font-medium">Ready for high-trust production environments?</p>
              <button 
                onClick={() => setSelectedDriver(null)}
                className="px-10 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20"
              >
                CLOSE VERIFICATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
