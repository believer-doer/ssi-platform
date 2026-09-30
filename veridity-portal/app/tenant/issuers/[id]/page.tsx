"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useParams } from 'next/navigation';
import { useSessionContext } from '@/lib/hooks/useSessionContext';
import Link from 'next/link';

type IssuerDetails = {
  id?: string;
  name?: string;
  status?: string;
  type?: string;
  metadata?: unknown;
  [key: string]: unknown;
};

export default function IssuerDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const { jwt, tenantId } = useSessionContext();

  const { data, isLoading, error } = useQuery<IssuerDetails>({
    queryKey: ['issuer', id],
    queryFn: async () => apiFetch<IssuerDetails>(`/{driver}/issuers/{did}`, 'get', {
      driver: 'internal', 
      tenantId: tenantId ?? 'tenant-001', 
      jwt: jwt ?? 'mock-jwt-token' 
    }),
    enabled: !!id,
  });
  const errorMessage = error !== null && error !== undefined ? String(error) : '';
  const issuerStatus = data?.status ?? 'unknown';

  const activateMutation = useMutation({
    mutationFn: async () =>
      apiFetch(`/{driver}/issuers/{did}/activate`, 'post', {
        driver: 'internal',
        tenantId: tenantId ?? 'tenant-001',
        jwt: jwt,
        params: { did: id }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issuer', id] });
      queryClient.invalidateQueries({ queryKey: ['issuers'] });
    },
  });

  if (!id) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <div className="text-lg font-medium">Missing issuer ID</div>
      <Link href={tenantId ? `/tenant/${tenantId}/issuers` : '/tenant/issuers'} className="mt-4 text-brand-600 hover:underline">Return to Issuers</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href={tenantId ? `/tenant/${tenantId}/issuers` : '/tenant/issuers'} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 mb-2">
            &larr; Back to Issuers
          </Link>
          <h3 className="text-3xl font-bold tracking-tight text-slate-900">Issuer Details</h3>
          <p className="text-slate-500">Detailed information and actions for this credential issuer.</p>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white/50 backdrop-blur-sm p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading issuer data...</p>
        </div>
      )}

      {errorMessage ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-medium flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error loading details: {errorMessage}
        </div>
      ) : null}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Issuer Name</p>
                  <p className="text-lg font-semibold text-slate-900">{data.name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                    issuerStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    issuerStatus === 'revoked' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {issuerStatus.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Issuer Type</p>
                  <p className="font-mono text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-lg inline-block">{data.type}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Resource ID</p>
                  <p className="font-mono text-xs text-slate-400 break-all">{data.id}</p>
                </div>
              </div>

              {issuerStatus !== 'active' && (
                <div className="pt-6 border-t border-slate-100">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Issuer requires activation</p>
                      <p className="text-sm text-amber-700 mt-0.5">Activate this issuer to begin issuing verifiable credentials within this tenant.</p>
                    </div>
                  </div>
                  <button
                    className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
                    onClick={() => activateMutation.mutate()}
                    disabled={activateMutation.isPending}
                  >
                    {activateMutation.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Activating...
                      </>
                    ) : 'Activate Issuer Now'}
                  </button>
                  {activateMutation.error && (
                    <div className="text-rose-600 text-xs mt-3 font-medium text-center">{String(activateMutation.error)}</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Onboarding Metadata</h4>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <pre className="text-[11px] font-mono text-slate-500 overflow-x-auto">
                  {JSON.stringify(data.metadata || { message: "No additional metadata available." }, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h4>
              <div className="grid grid-cols-1 gap-3">
                <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-100 group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Issue Credential</p>
                    <p className="text-xs text-slate-500">Using this issuer DID</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-100 group text-rose-600">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Revoke Issuer</p>
                    <p className="text-xs text-rose-400">Governance-gated critical lifecycle action</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-brand-600 text-white shadow-xl shadow-brand-600/20">
              <h4 className="text-sm font-bold mb-2">Driver Perspective</h4>
              <p className="text-xs text-brand-100/80 leading-relaxed mb-4">
                This issuer is managed by the <span className="font-bold text-white">Internal</span> driver. Private keys are stored in a secure HSM-backed vault.
              </p>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors">
                View Driver Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
