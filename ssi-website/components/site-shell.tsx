import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const siteNavigation = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/portal", label: "Portal" },
  { href: "/wallet", label: "Wallet" },
] as const;

export const portalHref = "/portal";
export const walletLinks = {
  appStore: "https://apps.apple.com",
  googlePlay: "https://play.google.com/store/apps",
} as const;

export function DELLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/assets/del-logo.svg"
      alt="Dancing Elephant Labs"
      width={32}
      height={32}
      className={className}
      unoptimized
      priority
    />
  );
}

export function BrandMark({
  dark = false,
  className = "",
}: {
  dark?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={dark ? "/assets/veridity-mark-dark.svg" : "/assets/veridity-mark.svg"}
      alt="Veridity mark"
      width={24}
      height={24}
      className={className}
      unoptimized
      priority
    />
  );
}

export function BrandLogo({
  dark = false,
  className = "",
}: {
  dark?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={dark ? "/assets/veridity-logo-dark.svg" : "/assets/veridity-logo.svg"}
      alt="Veridity"
      width={160}
      height={40}
      className={className}
      unoptimized
      priority
    />
  );
}

export function AccentBar() {
  return <div className="h-1 w-16 rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700" />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[0.72rem] font-semibold uppercase tracking-[0.35em] text-brand-700">{children}</p>;
}

export function SectionHeading({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-brand-600">{kicker}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance text-brand-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-brand-800 md:text-lg">{body}</p>
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
}) {
  const className = {
    primary:
      "inline-flex items-center justify-center rounded-full bg-brand-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800",
    secondary:
      "inline-flex items-center justify-center rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-950 transition hover:border-brand-300 hover:bg-brand-50",
    ghost:
      "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 hover:text-brand-950",
  }[variant];

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-brand-200/70 bg-brand-50/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex items-center gap-3 rounded-full border border-brand-200 bg-white/85 px-3 py-2 shadow-brand">
              <DELLogo className="h-7 w-7 rounded-full bg-white object-contain p-0.5" />
              <span className="flex flex-col">
                <BrandLogo className="h-6 w-auto" />
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-brand-600">
                  Dancing Elephant Labs
                </span>
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-brand-700">
            {siteNavigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-brand-950">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ButtonLink href={portalHref} variant="secondary">
              Open portal
            </ButtonLink>
            <ButtonLink href="/wallet" variant="primary">
              Get wallet
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-brand-200 bg-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <DELLogo className="h-8 w-8 rounded-full bg-white object-contain p-0.5 shadow-brand" />
              <div className="flex flex-col">
                <BrandLogo className="h-8 w-auto" />
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-brand-600">
                  A product offering from Dancing Elephant Labs
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-800">
              Veridity is the trust layer for verifiable credentials: a public website for the platform, a control portal for operators,
              and wallet flows for users.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Explore</p>
              <ul className="mt-4 space-y-2 text-sm text-brand-800">
                {siteNavigation.map((item) => (
                  <li key={item.href}>
                    <Link className="transition-colors hover:text-brand-950" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Downloads</p>
              <div className="mt-4 flex flex-col gap-3">
                <ButtonLink href={walletLinks.appStore} variant="secondary" external>
                  App Store placeholder
                </ButtonLink>
                <ButtonLink href={walletLinks.googlePlay} variant="secondary" external>
                  Google Play placeholder
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
