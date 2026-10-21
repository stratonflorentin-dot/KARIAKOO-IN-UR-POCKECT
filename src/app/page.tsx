import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "KARIAKOO — now closer to you",
  description: "Shop Kariakoo's trusted shops online: fashion, electronics, food and home essentials, delivered across Dar es Salaam.",
};

/** Splash / onboarding: brand promise over Dar es Salaam, then Get Started or Login (reference frame 1). */
export default function SplashPage() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-night text-white">
      <Image src="/brand/dar-city.webp" alt="" fill priority sizes="100vw" className="object-cover object-[50%_60%]" />
      {/* Deep green at the top for the logo, city in the middle, dark again for the buttons. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-night via-night/55 to-night/95" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-16 sm:pt-24">
        <div className="flex flex-col items-center text-center">
          <Logo tone="light" href="/" tagline size="xl" />
          <p className="mt-5 text-sm font-semibold tracking-wide text-white/90">Kununua · Kupeleka · Kufaidika</p>
          <p className="mt-4 max-w-xs text-base text-white/85 drop-shadow">Tanzania&apos;s trusted marketplace and delivery network.</p>
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <ButtonLink href="/welcome" variant="gold" size="lg" full>Get Started</ButtonLink>
          <ButtonLink href="/sign-in" variant="glass" size="lg" full>Login</ButtonLink>
        </div>
      </div>
    </main>
  );
}
