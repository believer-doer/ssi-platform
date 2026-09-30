import { AccentBar, ButtonLink, Eyebrow, SectionHeading } from "@/components/site-shell";

const steps = [
  {
    title: "1. Set up the trust boundary",
    body: "Create tenants, define issuers and verifiers, and decide which trust changes need approvals before they become live.",
  },
  {
    title: "2. Issue or request credentials",
    body: "Use OIDC4VCI to issue a credential to a wallet or OIDC4VP to request one back from a wallet during verification.",
  },
  {
    title: "3. Persist the proof of the exchange",
    body: "Save the operational state, status, and audit trail in the backend so later verification and review do not depend on a single runtime session.",
  },
];

const surfaces = [
  {
    title: "Control plane",
    body: "Operators use the portal and APIs to manage tenants, policies, issuers, verifiers, schemas, and trust decisions.",
  },
  {
    title: "Protocol plane",
    body: "Wallets and verifiers interact through public OIDC4VCI and OIDC4VP endpoints for live issuance and presentation flows.",
  },
  {
    title: "Trust layer",
    body: "Governance, revocation, status roots, and registry state keep the system auditable and hard to tamper with.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="relative overflow-hidden bg-brand-50 text-brand-950">
      <section className="border-b border-brand-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div className="animate-fadeUp">
            <AccentBar />
            <Eyebrow>How it works</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-balance md:text-7xl">
              Veridity turns credential exchange into a governed, auditable flow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-800 md:text-xl">
              The platform separates operational administration, live protocol traffic, and trust governance so each layer can do one job well.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/portal">Open portal</ButtonLink>
              <ButtonLink href="/wallet" variant="secondary">
                Get wallet
              </ButtonLink>
            </div>
          </div>

          <div className="surface-outline rounded-[2rem] border border-brand-200 bg-white p-7 shadow-soft">
            <div className="grid gap-4">
              {surfaces.map((surface) => (
                <div key={surface.title} className="rounded-[1.5rem] border border-brand-200 bg-brand-50 p-5">
                  <div className="h-1 w-12 rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700" />
                  <h2 className="mt-4 text-lg font-semibold text-brand-950">{surface.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-brand-800">{surface.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-brand-200 bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            kicker="Flow"
            title="Three moves from setup to exchange."
            body="The platform is designed for teams that need both operational control and standards-based wallet interaction."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="rounded-[1.75rem] border border-brand-200 bg-brand-50 p-6 shadow-brand">
                <AccentBar />
                <h3 className="mt-5 text-xl font-semibold text-brand-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-800">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            kicker="What the user sees"
            title="Wallets and verifiers only see the session they need."
            body="The protocol plane exposes a narrow runtime surface so credential exchange stays focused and secure."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-brand-200 bg-white p-6 shadow-brand">
              <h3 className="text-xl font-semibold text-brand-950">Issuance</h3>
              <p className="mt-3 text-sm leading-7 text-brand-800">
                A user opens the wallet, scans a QR code or follows an invite, completes the authorization step, and receives the credential.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-brand-200 bg-white p-6 shadow-brand">
              <h3 className="text-xl font-semibold text-brand-950">Presentation</h3>
              <p className="mt-3 text-sm leading-7 text-brand-800">
                A verifier starts a request, the wallet selects the right credential, and the platform submits the presentation through the session callback.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/use-cases">See use cases</ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Back home
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
