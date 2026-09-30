import Link from "next/link";
import {
  AccentBar,
  DELLogo,
  BrandLogo,
  ButtonLink,
  Eyebrow,
  SectionHeading,
  walletLinks,
} from "@/components/site-shell";

const pillars = [
  {
    title: "Control plane",
    body: "Portal, APIs, lifecycle management, monitoring, and tenant administration.",
  },
  {
    title: "Protocol plane",
    body: "OIDC4VCI and OIDC4VP runtime for wallets, issuers, and relying parties.",
  },
  {
    title: "Trust layer",
    body: "Governance workflows, policies, approvals, and trust registry operations.",
  },
];

const useCases = [
  "Fintech onboarding",
  "Employment verification",
  "Education credentials",
  "Membership access",
  "Consortium trust networks",
  "Status and revocation checks",
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-brand-50 text-brand-950">
      <section className="border-b border-brand-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
          <div className="animate-fadeUp">
            <AccentBar />
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-brand-200 bg-white px-4 py-2 shadow-brand">
              <DELLogo className="h-6 w-6 rounded-full bg-white object-contain p-0.5" />
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
                A product offering from Dancing Elephant Labs
              </span>
            </div>
            <Eyebrow>Veridity</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-balance md:text-7xl">
              The trust layer for verifiable credentials.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-800 md:text-xl">
              Veridity helps organizations issue, verify, trust, and govern digital identity flows across tenants using open standards.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/how-it-works">How it works</ButtonLink>
              <ButtonLink href="/portal" variant="secondary">
                Portal placeholder
              </ButtonLink>
              <ButtonLink href="/wallet" variant="secondary">
                Wallet downloads
              </ButtonLink>
            </div>
          </div>

          <div className="surface-outline relative overflow-hidden rounded-[2rem] border border-brand-200 bg-white p-7 shadow-soft">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(92,242,200,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(11,108,255,0.08),transparent_40%)]" />
            <div className="relative grid gap-5">
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 shadow-brand">
                  <BrandLogo dark className="h-7 w-auto" />
                </div>
                <span className="text-[0.72rem] uppercase tracking-[0.3em] text-brand-600">
                  Multi-tenant identity infrastructure
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="rounded-[1.5rem] border border-brand-200 bg-brand-50 p-5 shadow-[0_10px_24px_rgba(4,27,45,0.05)]"
                  >
                    <div className="h-1 w-12 rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">{pillar.title}</p>
                    <p className="mt-4 text-sm leading-6 text-brand-800">{pillar.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.5rem] border border-brand-300/30 bg-gradient-to-r from-brand-100 via-white to-brand-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">What you can do</p>
                <p className="mt-3 text-sm leading-6 text-brand-800">
                  Issue credentials, request presentations, govern trust, and keep the control plane separate from the wallet experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            kicker="How to use Veridity"
            title="A simple flow for operators, issuers, and holders."
            body="Set up the platform, let users install the wallet, and then issue or verify credentials through the protocol endpoints."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "1. Configure the platform",
                body: "Create tenants, onboard issuers and verifiers, and define the trust rules that govern your ecosystem.",
              },
              {
                title: "2. Issue to a wallet",
                body: "Send an OIDC4VCI invitation or QR code, then deliver credentials into the user’s wallet.",
              },
              {
                title: "3. Verify on demand",
                body: "Request a presentation with OIDC4VP and validate only the claims needed for the transaction.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.75rem] border border-brand-200 bg-brand-50 p-6 shadow-brand">
                <AccentBar />
                <h2 className="mt-5 text-xl font-semibold text-brand-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-brand-800">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-brand-200 bg-brand-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <SectionHeading
              kicker="Use cases"
              title="Built for the moments where trust is part of the product."
              body="Veridity works best when credentials must be portable, auditable, and governed rather than trapped in one app."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {useCases.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-brand-200 bg-white px-4 py-4 text-sm font-medium text-brand-800 shadow-brand"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-brand-200 bg-brand-950">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="surface-outline overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(92,242,200,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(34,199,216,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(11,108,255,0.12),transparent_38%)] p-8 md:p-10">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-brand-300/80">Launch points</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-brand-50 md:text-5xl">
              Use the portal for operations and the wallet for holder flows.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-brand-100 md:text-lg">
              The portal is the operator surface, and the wallet is the user surface. Both are tied to the same Veridity trust model.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/portal" variant="secondary">
                Portal placeholder
              </ButtonLink>
              <ButtonLink href={walletLinks.appStore} external variant="secondary">
                App Store placeholder
              </ButtonLink>
              <ButtonLink href={walletLinks.googlePlay} external variant="secondary">
                Google Play placeholder
              </ButtonLink>
            </div>
            <div className="mt-8">
              <Link href="/how-it-works" className="text-sm font-semibold text-brand-300 transition hover:text-brand-50">
                Learn how the platform works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
