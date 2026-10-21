import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "KARIAKOO — now closer to you",
  description: "Shop Kariakoo's trusted shops online: fashion, electronics, food and home essentials, delivered across Dar es Salaam.",
};

/** Splash / onboarding: brand promise, then Get Started or Login (reference frame 1). */
export default function SplashPage() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-night text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(40rem_26rem_at_50%_8%,rgba(16,185,129,0.45),transparent_65%),radial-gradient(36rem_18rem_at_50%_100%,rgba(245,190,30,0.28),transparent_70%)]" />
      <Skyline />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-16 sm:pt-24">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Logo tone="light" href="/" tagline size="xl" />
          <p className="mt-5 text-sm font-semibold tracking-wide text-white/85">Kununua · Kupeleka · Kufaidika</p>
          <p className="mt-6 max-w-xs text-base text-white/70">Tanzania&apos;s trusted marketplace and delivery network.</p>
        </div>

        <div className="relative mt-10 space-y-3">
          <ButtonLink href="/welcome" variant="gold" size="lg" full>Get Started</ButtonLink>
          <ButtonLink href="/sign-in" variant="glass" size="lg" full>Login</ButtonLink>
          <p className="pt-1 text-center text-sm">
            <Link href="/customer" className="font-medium text-white/75 underline underline-offset-4 hover:text-white">Browse as a guest</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

/** Decorative Dar es Salaam skyline silhouette behind the buttons. */
function Skyline() {
  const towers: [number, number, number][] = [
    [0, 70, 14], [16, 110, 12], [30, 150, 18], [50, 95, 10], [62, 190, 16], [80, 130, 14], [96, 240, 20],
    [118, 160, 12], [132, 120, 16], [150, 210, 14], [166, 150, 18], [186, 100, 12], [200, 175, 16], [218, 125, 14],
    [234, 260, 22], [258, 140, 12], [272, 185, 16], [290, 105, 14], [306, 155, 18], [326, 90, 12], [340, 135, 16],
    [358, 80, 14], [374, 120, 26],
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 400 280" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full">
      <defs>
        <linearGradient id="kk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#064e3b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0a211a" stopOpacity="1" />
        </linearGradient>
      </defs>
      {towers.map(([x, h, w]) => (
        <rect key={x} x={x} y={280 - h} width={w} height={h} rx="1.5" fill="url(#kk-sky)" />
      ))}
      <rect x="0" y="272" width="400" height="8" fill="#0a211a" />
    </svg>
  );
}
