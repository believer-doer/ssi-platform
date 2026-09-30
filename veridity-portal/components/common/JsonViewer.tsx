import { CopyButton } from "@/components/common/CopyButton";

export function JsonViewer({ data, title = "JSON" }: { data: unknown; title?: string }) {
  const value = JSON.stringify(data, null, 2);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</div>
        <CopyButton value={value} />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6">{value}</pre>
    </div>
  );
}
