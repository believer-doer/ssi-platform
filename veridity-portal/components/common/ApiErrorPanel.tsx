export function ApiErrorPanel({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <div className="font-bold">Request failed</div>
      <div className="mt-1 whitespace-pre-wrap">{error}</div>
    </div>
  );
}
