import { AccentBar, ButtonLink, Eyebrow, SectionHeading } from "@/components/site-shell";

const useCases = [
  {
    title: "Fintech onboarding",
    body: "Verify identity credentials during KYC and reduce manual document review while keeping the full flow auditable.",
    points: ["Identity checks", "Risk review", "Consent-driven sharing"],
  },
  {
    title: "Education credentials",
    body: "Issue diplomas, transcripts, and certifications that students can present without needing a new login or paper scan.",
    points: ["Degrees", "Certificates", "Selective disclosure"],
  },
  {
    title: "Employment verification",
    body: "Help employers and staffing platforms confirm qualifications and employment history with a wallet presentation.",
    points: ["Work history", "Role validation", "Fast onboarding"],
  },
  {
    title: "Membership and access",
    body: "Use credentials for club access, event entry, or subscriber-only services where status changes over time.",
    points: ["Membership", "Event access", "Status updates"],
  },
  {
    title: "Consortium trust networks",
    body: "Coordinate issuers and verifiers across organizations that need a shared trust registry and governed changes.",
    points: ["Trusted issuer lists", "Approvals", "Shared policies"],
  },
  {
    title: "Revocation and status checks",
    body: "Keep credential status and root state available so relying parties can check validity before granting access.",
    points: ["Revocation roots", "Status lookups", "Audit trail"],
  },
];

export default function UseCasesPage() {
  return (
    <main className="relative overflow-hidden bg-brand-50 text-brand-950">
      <section className="border-b border-brand-200">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-4xl animate-fadeUp">
            <AccentBar />
            <Eyebrow>Use cases</Eyebrow>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance md:text-7xl">
              Where Veridity fits in the real world.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-brand-800 md:text-xl">
              Veridity is useful anywhere a credential should be issued once, presented many times, and governed with a clear trust model.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/portal">Open portal</ButtonLink>
              <ButtonLink href="/wallet" variant="secondary">
                Get wallet
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            kicker="Scenarios"
            title="Common deployments by industry."
            body="These are the kinds of programs that benefit most from standards-based issuance, wallet presentation, and governed trust updates."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {useCases.map((item) => (
              <article key={item.title} className="rounded-[1.75rem] border border-brand-200 bg-brand-50 p-6 shadow-brand">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-brand-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-brand-800">{item.body}</p>
                  </div>
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                </div>
                <ul className="mt-5 space-y-2">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm leading-7 text-brand-800">
                      <span className="mt-2 h-2 w-2 rounded-full bg-brand-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-brand-200 bg-brand-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <SectionHeading
              kicker="Best fit"
              title="A good match when trust matters more than paper."
              body="Use Veridity when users should control their own credentials, while operators still need strong governance and a clean audit trail."
            />
          </div>
          <div className="rounded-[2rem] border border-brand-200 bg-white p-7 shadow-brand">
            <h3 className="text-xl font-semibold text-brand-950">Typical reasons to choose Veridity</h3>
            <div className="mt-5 grid gap-3 text-sm leading-7 text-brand-800">
              <p>• You need a public wallet flow, not just a backend API.</p>
              <p>• You need issuer, verifier, and trust decisions to be governed.</p>
              <p>• You need a standards-based protocol layer that can interoperate with external wallets.</p>
              <p>• You need a platform that can serve multiple tenants without collapsing their data together.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
