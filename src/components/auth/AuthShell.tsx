import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * Branded shell for every sign-in screen (reference login mockups): a Dar es
 * Salaam city photo header carrying the logo and a "Karibu…" greeting, with a
 * white card overlapping it that holds the role badge and the form.
 */
export function AuthShell({
  greeting,
  intro,
  title,
  subtitle,
  icon,
  children,
}: {
  greeting: string;
  intro: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-stone-50">
      <header className="relative h-[20rem] overflow-hidden text-white sm:h-[22rem]">
        <Image src="/brand/dar-city.webp" alt="" fill priority sizes="100vw" className="object-cover object-[50%_40%]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/35 to-night/75" />
        <div className="kk-auth-logo relative mx-auto flex h-full max-w-md flex-col px-6 pb-16 pt-8">
          <div className="flex flex-col items-center text-center">
            <Logo tone="light" href="/" tagline size="lg" />
            <p className="mt-2 text-xs font-semibold tracking-wide text-white/90">Kununua · Kupeleka · Kufaidika</p>
          </div>
          <div className="mt-auto">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow">{greeting}</h1>
            <p className="mt-1 text-sm text-white/90 drop-shadow">{intro}</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-md px-4">
        <div className="kk-auth-card rounded-3xl bg-white p-6 shadow-xl shadow-stone-950/10 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white">{icon}</span>
            <div className="min-w-0">
              <p className="font-bold">{title}</p>
              <p className="text-sm text-muted">{subtitle}</p>
            </div>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>

      {/* Green wave with a gold edge along the bottom, as in the mockups. */}
      <svg aria-hidden="true" viewBox="0 0 400 60" preserveAspectRatio="none" className="mt-auto h-14 w-full pt-6">
        <path d="M0 30 C 90 0, 170 55, 260 25 S 360 10, 400 22 L400 60 L0 60 Z" fill="#f5be1e" />
        <path d="M0 36 C 90 8, 170 62, 260 32 S 360 18, 400 30 L400 60 L0 60 Z" fill="#047857" />
      </svg>
    </div>
  );
}
