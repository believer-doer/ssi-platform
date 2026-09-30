"use client";
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSessionContext } from '@/lib/hooks/useSessionContext';
import { shortId } from '@/utils/formatId';
import { RoleGuard } from '@/components/RoleGuard';

const actionableStatuses = new Set(['pending', 'proposed', 'approved']);

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
  requiredApprovals?: number | string;
  approvalsNeeded?: number | string;
  [key: string]: unknown;
};

export default function GovernancePage() {
  const { jwt, tenantId, roles } = useSessionContext();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const canMutate = (roles ?? []).some((role) => ['tenant-admin', 'platform-admin'].includes(role));
  const tenant = tenantId ?? 'tenant-001';

  const { data: proposals, isLoading, error } = useQuery({
    queryKey: ['governance-proposals', tenant],
    queryFn: () => apiFetch<GovernanceProposal[]>('/{driver}/governance/proposals', 'get', {
      driver: 'internal',
      tenantId: tenant,
      jwt,
    }),
  });


  async function performAction(proposalId: string, action: 'approve' | 'reject' | 'cancel' | 'execute') {
    setMessage(null);
    const res = await fetch(`/api/backend/internal/governance/proposals/${encodeURIComponent(proposalId)}/${action}`, {
      method: 'POST',
      credentials: 'include',
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(payload?.message || payload?.error || `Unable to ${action} proposal ${proposalId}`);
      return;
    }
    setMessage(`Proposal ${proposalId} ${action}d successfully.`);
    queryClient.invalidateQueries({ queryKey: ['governance-proposals', tenant] });
  }

  const summary = useMemo(() => {
    const list = Array.isArray(proposals) ? proposals : [];
    return {
      total: list.length,
      pending: list.filter((item) => ['pending', 'proposed'].includes(String(item.status || item.state || '').toLowerCase())).length,
      approved: list.filter((item) => String(item.status || item.state || '').toLowerCase() === 'approved').length,
      executed: list.filter((item) => String(item.status || item.state || '').toLowerCase() === 'executed').length,
    };
  }, [proposals]);

  return (
    <RoleGuard roles={["tenant-admin", "platform-admin", "auditor"]}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-3xl font-extrabold tracking-tight text-slate-900">Governance Proposals</h3>
          <p className="text-slate-500">Hybrid lifecycle model: low-risk actions are direct, critical changes remain governance-gated.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{key}</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {message ? <div className="rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white">{message}</div> : null}

        {isLoading ? <div className="text-slate-500">Loading proposals…</div> : null}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Error loading proposals: {String(error)}</div> : null}

        {!isLoading && !error ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Proposal</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Approvals</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(Array.isArray(proposals) ? proposals : []).map((item) => {
                  const proposalId = item.proposalId || item.id || 'unknown';
                  const status = String(item.status || item.state || 'unknown').toLowerCase();
                  return (
                    <tr key={proposalId} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        <div className="font-mono text-xs text-slate-500">{shortId(proposalId, 14, 'N/A')}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.governanceType || item.type || 'unknown'}</td>
                      <td className="px-6 py-4 text-sm"><span className="badge-pending">{status}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.subjectType || item.registryType || 'unknown'} / {item.subjectId || item.entityId || 'n/a'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.requiredApprovals ?? item.approvalsNeeded ?? 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {canMutate && actionableStatuses.has(status) ? (
                            <>
                              <button onClick={() => performAction(proposalId, 'approve')} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Approve</button>
                              <button onClick={() => performAction(proposalId, 'reject')} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Reject</button>
                              <button onClick={() => performAction(proposalId, 'cancel')} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Cancel</button>
                            </>
                          ) : null}
                          {canMutate && status === 'approved' ? (
                            <button onClick={() => performAction(proposalId, 'execute')} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">Execute</button>
                          ) : null}
                          {!canMutate ? <span className="text-xs text-slate-400">Read only</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}
