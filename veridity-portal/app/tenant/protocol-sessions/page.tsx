"use client";

import { FormEvent, useState } from 'react';

async function readJson(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export default function ProtocolSessionsPage() {
  const [protocol, setProtocol] = useState<'oidc4vci' | 'oidc4vp'>('oidc4vci');
  const [sessionId, setSessionId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData(event.currentTarget);

    const body = {
      tenantId: form.get('tenantId') || undefined,
      flow: form.get('flow') || protocol,
      credentialConfigurationId: form.get('credentialConfigurationId') || undefined,
      presentationDefinitionId: form.get('presentationDefinitionId') || undefined,
      format: form.get('format') || 'jwt_vc',
      claims: {
        sub: String(form.get('subject') || 'did:example:holder'),
        email: String(form.get('email') || 'holder@example.com'),
      },
    };

    try {
      const res = await fetch(`/api/backend/internal/protocols/${protocol}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await readJson(res);
      if (!res.ok) throw new Error(payload?.error_description || payload?.message || 'Unable to create session');
      setResult(payload);
      if (payload?.id) setSessionId(payload.id);
      if (payload?.transactionId) setTransactionId(payload.transactionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create session');
    } finally {
      setLoading(false);
    }
  };

  const lookupSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/internal/protocols/sessions/${encodeURIComponent(sessionId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await readJson(res);
      if (!res.ok) throw new Error(payload?.error_description || payload?.message || 'Unable to fetch session');
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch session');
    } finally {
      setLoading(false);
    }
  };

  const lookupDeferred = async () => {
    if (!transactionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/internal/protocols/deferred/${encodeURIComponent(transactionId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await readJson(res);
      if (!res.ok) throw new Error(payload?.error_description || payload?.message || 'Unable to fetch deferred state');
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch deferred state');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">Protocol Sessions</h3>
        <p className="text-slate-500 mt-2">
          Phase P1 replaces the broken legacy aggregate endpoint with protocol-specific create and lookup tools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={createSession} className="bg-white rounded-3xl border border-slate-200 p-8 space-y-5 shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-500">Protocol</label>
            <select value={protocol} onChange={(e) => setProtocol(e.target.value as 'oidc4vci' | 'oidc4vp')} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
              <option value="oidc4vci">OIDC4VCI</option>
              <option value="oidc4vp">OIDC4VP</option>
            </select>
          </div>
          <input name="tenantId" placeholder="tenant-001 (optional)" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <input name="credentialConfigurationId" placeholder="credential configuration id" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <input name="presentationDefinitionId" placeholder="presentation definition id" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <input name="subject" placeholder="holder DID" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <input name="email" placeholder="holder email" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <select name="format" className="w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="jwt_vc">JWT VC</option>
            <option value="sd_jwt_vc">SD-JWT VC</option>
          </select>
          <input name="flow" placeholder="issuance or verification flow hint" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <button disabled={loading} className="rounded-2xl bg-indigo-600 text-white px-5 py-3 font-bold disabled:opacity-60">
            {loading ? 'Working…' : 'Create session'}
          </button>
        </form>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-5 shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-500">Session ID</label>
            <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <button onClick={lookupSession} disabled={loading || !sessionId} className="mt-3 rounded-2xl bg-slate-900 text-white px-5 py-3 font-bold disabled:opacity-60">
              Fetch session
            </button>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Deferred transaction ID</label>
            <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <button onClick={lookupDeferred} disabled={loading || !transactionId} className="mt-3 rounded-2xl bg-slate-100 text-slate-900 px-5 py-3 font-bold disabled:opacity-60">
              Fetch deferred state
            </button>
          </div>
          <div className="text-sm text-slate-500">
            Supported backend routes: <code>/protocols/&#123;protocol&#125;/sessions</code>, <code>/protocols/sessions/&#123;id&#125;</code>, and <code>/protocols/deferred/&#123;transactionId&#125;</code>.
          </div>
        </div>
      </div>

      {error !== null && error !== undefined ? <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3">{String(error)}</div> : null}
      {result !== null && result !== undefined ? (
        <pre className="rounded-3xl bg-slate-950 text-emerald-300 p-6 overflow-x-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
