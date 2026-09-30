import { AccentBar, ButtonLink, Eyebrow, SectionHeading, walletLinks } from "@/components/site-shell";

const walletSteps = [
  {
    title: "Install the wallet",
    body: "Use the App Store or Google Play placeholder links on this page until the production app listings are live.",
  },
  {
    title: "Receive a credential",
    body: "Scan the QR code or follow the invite link from an issuer and complete the OIDC4VCI flow in the wallet.",
  },
  {
    title: "Present when asked",
    body: "Respond to a verifier request with OIDC4VP and share only the data the session actually requires.",
  },
];

export default function WalletPage() {
  return (
    <main className="relative overflow-hidden bg-brand-50 text-brand-950">
      <section className="border-b border-brand-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div className="animate-fadeUp">
            <AccentBar />
            <Eyebrow>Wallet</Eyebrow>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance md:text-7xl">
              A wallet built for receiving and presenting Veridity credentials.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-800 md:text-xl">
              This page links to placeholder app listings for the Veridity wallet. Once the mobile apps are live, these buttons can point to the real downloads.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={walletLinks.appStore} external>
                App Store placeholder
              </ButtonLink>
              <ButtonLink href={walletLinks.googlePlay} external variant="secondary">
                Google Play placeholder
              </ButtonLink>
            </div>
          </div>

          <div className="surface-outline rounded-[2rem] border border-brand-200 bg-white p-7 shadow-soft">
            <SectionHeading
              kicker="User flow"
              title="Simple for holders, strict for protocol."
              body="The wallet experience is centered on QR entry, secure storage, and standards-based presentation."
            />
            <div className="mt-8 grid gap-4">
              {walletSteps.map((step) => (
                <div key={step.title} className="rounded-[1.5rem] border border-brand-200 bg-brand-50 p-5">
                  <h2 className="text-lg font-semibold text-brand-950">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-brand-800">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            kicker="What it supports"
            title="Receiving, storing, and presenting credentials."
            body="The wallet is meant to work with the Veridity backend, not replace it. The backend handles trust, issuance, and protocol state; the wallet handles the holder experience."
          />
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/how-it-works" variant="secondary">
              Learn how it works
            </ButtonLink>
            <ButtonLink href="/use-cases" variant="secondary">
              Explore use cases
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
