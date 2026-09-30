"use client";

import { useCallback, useState } from "react";
import { ApiErrorPanel } from "@/components/common/ApiErrorPanel";
import { JsonViewer } from "@/components/common/JsonViewer";
import { PollingCard } from "@/components/common/PollingCard";
import { SectionCard } from "@/components/common/SectionCard";

async function callApi(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "include" });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new Error(typeof data === "string" ? data : data?.error_description || data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

const defaultAuthorize = {
  verifierDid: "did:example:verifier-001",
  holderDid: "did:example:holder-001",
  format: "vc-jwt",
  presentation_definition: {
    id: "employee-access-check",
    input_descriptors: [
      { id: "employee-card", constraints: { fields: [{ path: ["$.vc.type"] }] } }
    ]
  }
};

const defaultCallback = {
  sessionId: "",
  state: "",
  presentation: {
    holder: "did:example:holder-001",
    verifiableCredential: []
  },
  format: "vc-jwt"
};

export function Oidc4VpConsole({ tenantId }: { tenantId: string }) {
  const [authorizeBody, setAuthorizeBody] = useState(JSON.stringify({ ...defaultAuthorize, tenantId }, null, 2));
  const [callbackBody, setCallbackBody] = useState(JSON.stringify(defaultCallback, null, 2));
  const [authorizeResult, setAuthorizeResult] = useState<Record<string, unknown> | null>(null);
  const [requestResult, setRequestResult] = useState<Record<string, unknown> | null>(null);
  const [callbackResult, setCallbackResult] = useState<Record<string, unknown> | null>(null);
  const [sessionResult, setSessionResult] = useState<Record<string, unknown> | null>(null);
  const [pollSession, setPollSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = authorizeResult?.request_uri ? String(authorizeResult.request_uri).split('/').pop() : '';

  const run = useCallback(async (fn: () => Promise<void>) => {
    try {
      setError(null);
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    const data = await callApi(`/internal/protocols/sessions/${encodeURIComponent(sessionId)}`);
    setSessionResult(data as Record<string, unknown>);
  }, [sessionId]);

  return (
    <div className="space-y-6">
      <ApiErrorPanel error={error} />
      <SectionCard title="1. Create presentation request" description="Generate a verifier-side OIDC4VP authorization request and receive a request_uri that can be handed to a wallet.">
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <textarea value={authorizeBody} onChange={(e) => setAuthorizeBody(e.target.value)} className="min-h-[260px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          <div className="space-y-4">
            <button onClick={() => run(async () => {
              const data = await callApi('/internal/protocols/oidc4vp/authorize', { method: 'POST', body: authorizeBody });
              setAuthorizeResult(data as Record<string, unknown>);
              setRequestResult(null);
              setCallbackResult(null);
              setSessionResult(null);
              setPollSession(true);
              const response = data as Record<string, unknown>;
              const reqId = String(response.request_uri || '').split('/').pop() || '';
              setCallbackBody(JSON.stringify({ ...defaultCallback, sessionId: reqId, state: response.state || reqId, format: JSON.parse(authorizeBody).format || 'vc-jwt' }, null, 2));
            })} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Create verifier request</button>
            {authorizeResult ? <JsonViewer data={authorizeResult} title="Authorize response" /> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="2. Retrieve request_uri document" description="Inspect the JSON document that a wallet would fetch via request_uri before posting the VP response.">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => run(async () => {
            if (!sessionId) throw new Error('Create a presentation request first');
            const data = await callApi(`/internal/protocols/oidc4vp/requests/${encodeURIComponent(sessionId)}`);
            setRequestResult(data as Record<string, unknown>);
          })} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold">Fetch request document</button>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={pollSession} onChange={(e) => setPollSession(e.target.checked)} /> Poll session</label>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {requestResult ? <JsonViewer data={requestResult} title="request_uri payload" /> : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Fetch the request document after creating a session.</div>}
          <PollingCard active={pollSession && !!sessionId} onTick={() => { void run(refreshSession); }}>
            {sessionResult ? <JsonViewer data={sessionResult} title="Protocol session" /> : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Session details will appear here.</div>}
          </PollingCard>
        </div>
      </SectionCard>

      <SectionCard title="3. Simulate wallet callback" description="Post a VP payload to the verifier callback. The response includes the verification decision emitted by the backend.">
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <textarea value={callbackBody} onChange={(e) => setCallbackBody(e.target.value)} className="min-h-[240px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          <div className="space-y-4">
            <button onClick={() => run(async () => {
              const data = await callApi('/internal/protocols/oidc4vp/callback', { method: 'POST', body: callbackBody });
              setCallbackResult(data as Record<string, unknown>);
            })} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Submit callback</button>
            {callbackResult ? <JsonViewer data={callbackResult} title="Callback result" /> : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
