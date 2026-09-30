export function StatusBadge({ status }: { status?: string | null }) {
  const value = (status || "unknown").toLowerCase();
  const tone = value.includes("verified") || value.includes("issued") || value.includes("ready") || value.includes("success")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : value.includes("fail") || value.includes("invalid") || value.includes("error") || value.includes("expired")
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : value.includes("pending") || value.includes("authorized") || value.includes("created")
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${tone}`}>{value}</span>;
}
