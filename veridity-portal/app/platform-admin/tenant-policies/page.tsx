"use client";

import { FormEvent, useEffect, useState } from 'react';

async function readJson(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

type TenantRecord = {
  id?: string;
  name?: string;
  [key: string]: unknown;
};

function normalizeTenants(payload: unknown): TenantRecord[] {
  if (Array.isArray(payload)) return payload as TenantRecord[];
  if (typeof payload === 'object' && payload !== null && Array.isArray((payload as { items?: TenantRecord[] }).items)) {
    return (payload as { items: TenantRecord[] }).items;
  }
  return [];
}

export default function TenantPoliciesPage() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [policyText, setPolicyText] = useState('{\n  "issuance": {\n    "requireApproval": true\n  }\n}');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/backend/internal/tenants', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        const payload = await readJson(res);
        if (!res.ok) throw new Error(payload?.message || payload?.error || 'Unable to load tenants');
        if (!ignore) {
          const items = normalizeTenants(payload);
          setTenants(items);
          if (items[0]?.id && !tenantId) setTenantId(items[0].id);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Unable to load tenants');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [tenantId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const parsed = JSON.parse(policyText);
      const res = await fetch(`/api/backend/internal/tenants/${encodeURIComponent(tenantId)}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed),
      });
      const payload = await readJson(res);
      if (!res.ok) throw new Error(payload?.message || payload?.error || 'Unable to apply policy');
      setMessage('Tenant policy applied successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">Tenant Policies</h3>
        <p className="text-slate-500 mt-2">Phase P2 keeps tenant policy editing under platform operations while the tenant workspace now uses tenant-aware routing.</p>
      </div>

      {loading ? <div>Loading tenants…</div> : null}
      {error ? <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3">{error}</div> : null}
      {message ? <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3">{message}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-1">
          <h4 className="font-black text-slate-900 mb-4">Tenants</h4>
          <div className="space-y-2">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setTenantId(tenant.id ?? '')}
                className={`w-full text-left rounded-2xl px-4 py-3 border ${tenantId === tenant.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <div className="font-bold">{tenant.name ?? tenant.id}</div>
                <div className="text-xs text-slate-500">{tenant.id}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500">Selected tenant</label>
            <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Policy JSON</label>
            <textarea value={policyText} onChange={(e) => setPolicyText(e.target.value)} rows={16} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          </div>
          <button disabled={saving || !tenantId} className="rounded-2xl bg-slate-900 text-white px-5 py-3 font-bold disabled:opacity-60">
            {saving ? 'Applying…' : 'Apply policy'}
          </button>
        </form>
      </div>
    </div>
  );
}
