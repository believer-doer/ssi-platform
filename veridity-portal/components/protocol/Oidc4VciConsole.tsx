"use client";

import { useCallback, useMemo, useState } from "react";
import { ApiErrorPanel } from "@/components/common/ApiErrorPanel";
import { JsonViewer } from "@/components/common/JsonViewer";
import { PollingCard } from "@/components/common/PollingCard";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";

async function callApi(path: string, init: RequestInit = {}, protocolAccessToken?: string) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (protocolAccessToken) headers.set("x-protocol-access-token", protocolAccessToken);
  const res = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "include" });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new Error(typeof data === "string" ? data : data?.error_description || data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

const defaultAuthorize = {
  issuerDid: "did:example:issuer-001",
  schemaId: "schema.employee.idcard.v1",
  holderDid: "did:example:holder-001",
  format: "vc-jwt",
  claims: { given_name: "Alice", family_name: "Doe", employee_id: "E-001" },
  defer: false,
};

const defaultIssue = {
  format: "vc-jwt",
  proof: {
    proof_type: "jwt",
    jwt: "replace-with-wallet-proof-jwt"
  }
};

export function Oidc4VciConsole({ tenantId }: { tenantId: string }) {
  const [authorizeBody, setAuthorizeBody] = useState(JSON.stringify({ ...defaultAuthorize, tenantId }, null, 2));
  const [tokenBody, setTokenBody] = useState(JSON.stringify({ grant_type: "authorization_code", code: "", client_id: "portal-operator" }, null, 2));
  const [issueBody, setIssueBody] = useState(JSON.stringify(defaultIssue, null, 2));
  const [deferredInput, setDeferredInput] = useState("");
  const [authorizeResult, setAuthorizeResult] = useState<Record<string, unknown> | null>(null);
  const [tokenResult, setTokenResult] = useState<Record<string, unknown> | null>(null);
  const [issueResult, setIssueResult] = useState<Record<string, unknown> | null>(null);
  const [deferredResult, setDeferredResult] = useState<Record<string, unknown> | null>(null);
  const [sessionResult, setSessionResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollSession, setPollSession] = useState(false);

  const sessionId = String(authorizeResult?.session_id ?? sessionResult?.id ?? "");
  const accessToken = String(tokenResult?.access_token ?? "");
  const activeTransactionId = String(deferredInput || issueResult?.transaction_id || "");

  const run = useCallback(async (fn: () => Promise<void>) => {
    try {
      setError(null);
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const lookupSession = useCallback(async () => {
    if (!sessionId) return;
    const data = await callApi(`/internal/protocols/sessions/${encodeURIComponent(sessionId)}`);
    setSessionResult(data as Record<string, unknown>);
  }, [sessionId]);

  const lookupDeferred = useCallback(async () => {
    if (!activeTransactionId || !accessToken) return;
    const data = await callApi(`/internal/protocols/oidc4vci/deferred?transaction_id=${encodeURIComponent(activeTransactionId)}`, { method: "GET" }, accessToken);
    setDeferredResult(data as Record<string, unknown>);
  }, [activeTransactionId, accessToken]);

  const issueStatus = useMemo(() => issueResult?.transaction_id ? "deferred" : issueResult?.format ? "issued" : null, [issueResult]);

  return (
    <div className="space-y-6">
      <ApiErrorPanel error={error} />
      <SectionCard title="1. Authorize issuance session" description="Create an OIDC4VCI session and receive the authorization code, pre-authorized code, and c_nonce.">
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <textarea value={authorizeBody} onChange={(e) => setAuthorizeBody(e.target.value)} className="min-h-[260px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          <div className="space-y-4">
            <button onClick={() => run(async () => {
              const payload = JSON.parse(authorizeBody);
              const data = await callApi('/internal/protocols/oidc4vci/authorize', { method: 'POST', body: JSON.stringify(payload) });
              setAuthorizeResult(data as Record<string, unknown>);
              setSessionResult(null);
              setTokenResult(null);
              setIssueResult(null);
              setDeferredResult(null);
              setPollSession(true);
              const response = data as Record<string, unknown>;
              setTokenBody(JSON.stringify({ grant_type: response.pre_authorized_code ? 'urn:ietf:params:oauth:grant-type:pre-authorized_code' : 'authorization_code', code: response.authorization_code || '', pre_authorized_code: response.pre_authorized_code || '', client_id: 'portal-operator' }, null, 2));
              setIssueBody(JSON.stringify({ ...defaultIssue, format: payload.format || 'vc-jwt', claims: payload.claims || {} }, null, 2));
            })} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Create issuance session</button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-bold text-slate-900">Guidance</div>
              <p className="mt-2 leading-6">Use <span className="font-mono">format: vc-jwt</span> for JWT VC or <span className="font-mono">sd-jwt-vc</span> for SD-JWT VC. The claims object is passed through to the authorization session.</p>
            </div>
            {authorizeResult ? <JsonViewer data={authorizeResult} title="Authorization response" /> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="2. Exchange authorization code for access token" description="Use the returned authorization code or pre-authorized code to mint a protocol access token.">
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <textarea value={tokenBody} onChange={(e) => setTokenBody(e.target.value)} className="min-h-[220px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          <div className="space-y-4">
            <button onClick={() => run(async () => {
              const data = await callApi('/internal/protocols/oidc4vci/token', { method: 'POST', body: tokenBody });
              setTokenResult(data as Record<string, unknown>);
            })} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Mint access token</button>
            {tokenResult ? <JsonViewer data={tokenResult} title="Token response" /> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="3. Issue credential" description="Call the credential endpoint with the protocol access token. The proof object is required by the backend in most real flows.">
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <textarea value={issueBody} onChange={(e) => setIssueBody(e.target.value)} className="min-h-[220px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          <div className="space-y-4">
            <button disabled={!accessToken} onClick={() => run(async () => {
              const data = await callApi('/internal/protocols/oidc4vci/credential', { method: 'POST', body: issueBody }, accessToken);
              const response = data as Record<string, unknown>;
              setIssueResult(response);
              if (response.transaction_id) setDeferredInput(String(response.transaction_id));
            })} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Issue credential</button>
            {issueStatus ? <div className="text-sm text-slate-600">Issuance status <span className="ml-2"><StatusBadge status={issueStatus} /></span></div> : null}
            {issueResult ? <JsonViewer data={issueResult} title="Credential response" /> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="4. Deferred retrieval + session monitor" description="Monitor the driver session and query any deferred transaction returned by the credential endpoint.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Session monitor</div>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => run(lookupSession)} disabled={!sessionId} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Refresh session</button>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={pollSession} onChange={(e) => setPollSession(e.target.checked)} /> Poll every 4s</label>
              </div>
              <div className="mt-4 text-sm text-slate-600">Session ID: <span className="font-mono text-xs">{sessionId || 'n/a'}</span></div>
              <PollingCard active={pollSession && !!sessionId} onTick={() => { void run(lookupSession); }}>
                {sessionResult ? <div className="mt-4"><JsonViewer data={sessionResult} title="Protocol session" /></div> : null}
              </PollingCard>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Deferred transaction</div>
              <input value={deferredInput} onChange={(e) => setDeferredInput(e.target.value)} placeholder="transaction_id" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm" />
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => run(lookupDeferred)} disabled={!activeTransactionId || !accessToken} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Lookup deferred response</button>
              </div>
              {deferredResult ? <div className="mt-4"><JsonViewer data={deferredResult} title="Deferred response" /></div> : null}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
