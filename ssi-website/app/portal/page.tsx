import { AccentBar, ButtonLink, Eyebrow, SectionHeading, walletLinks } from "@/components/site-shell";

const adminTasks = [
  "Manage tenants and policies",
  "Onboard issuers and verifiers",
  "Approve trust or governance changes",
  "Inspect audit and protocol history",
];

export default function PortalPage() {
  return (
    <main className="relative overflow-hidden bg-brand-50 text-brand-950">
      <section className="border-b border-brand-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div className="animate-fadeUp">
            <AccentBar />
            <Eyebrow>Portal</Eyebrow>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance md:text-7xl">
              Operator console for Veridity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-800 md:text-xl">
              This is the public placeholder for the Veridity portal. It will be the place where platform admins and tenant operators manage trust, lifecycle, and protocol settings.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="#" external>
                Portal placeholder link
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>

          <div className="surface-outline rounded-[2rem] border border-brand-200 bg-white p-7 shadow-soft">
            <SectionHeading
              kicker="What it will do"
              title="A place for governed operations."
              body="The portal is for the people running the system, not the end user holding the wallet."
            />
            <ul className="mt-8 space-y-3">
              {adminTasks.map((task) => (
                <li key={task} className="flex items-start gap-3 text-sm leading-7 text-brand-800">
                  <span className="mt-2 h-2 w-2 rounded-full bg-brand-400" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            kicker="Launch status"
            title="This page is intentionally a placeholder."
            body="Swap in the live portal URL when it is ready. Until then, this page explains what the portal is for and keeps the public site complete."
          />
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={walletLinks.appStore} external variant="secondary">
              App Store placeholder
            </ButtonLink>
            <ButtonLink href={walletLinks.googlePlay} external variant="secondary">
              Google Play placeholder
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
