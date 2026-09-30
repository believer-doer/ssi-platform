import Link from 'next/link';

export default async function CredentialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">Credential Detail</h3>
        <p className="text-slate-500 mt-2">
          The legacy portal expected a per-credential detail endpoint that is not part of the updated backend contract.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900">
        <p className="font-bold">Unsupported route in Phase P1</p>
        <p className="mt-2 text-sm">
          Requested credential id: <span className="font-mono">{id}</span>
        </p>
        <p className="mt-3 text-sm">
          Use the credentials list and protocol session views for inspection until the backend adds a stable detail endpoint.
        </p>
      </div>

      <Link href="/tenant/credentials" className="inline-flex rounded-2xl bg-slate-900 text-white px-5 py-3 font-bold">
        Back to credentials
      </Link>
    </div>
  );
}
