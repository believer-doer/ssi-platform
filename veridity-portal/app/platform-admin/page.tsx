import Link from 'next/link';

export default function PlatformAdminPage() {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Welcome, Platform Admin!</h3>
      <ul className="list-disc ml-6">
        <li><Link href="/platform-admin/tenants" className="text-blue-600 hover:underline">Manage Tenants</Link></li>
        <li><Link href="/platform-admin/tenant-policies" className="text-blue-600 hover:underline">Tenant Policies</Link></li>
        <li><Link href="/platform-admin/system-status" className="text-blue-600 hover:underline">System Status</Link></li>
        <li><Link href="/platform-admin/driver-readiness" className="text-blue-600 hover:underline">Driver Readiness</Link></li>
        <li><Link href="/platform-admin/schemas" className="text-blue-600 hover:underline">Schemas</Link></li>
        <li><Link href="/platform-admin/templates" className="text-blue-600 hover:underline">Credential Templates</Link></li>
        <li><Link href="/platform-admin/governance" className="text-blue-600 hover:underline">Governance Proposals</Link></li>
        <li><Link href="/platform-admin/trust" className="text-blue-600 hover:underline">Trust Registry</Link></li>
      </ul>
    </div>
  );
}
