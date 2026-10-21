import type { Metadata } from "next";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: { absolute: t.meta.title }, description: t.meta.description };
}

/** Splash / onboarding: brand promise over Dar es Salaam, then Get Started or Login (reference frame 1). */
export default async function SplashPage() {
  const t = await getDictionary();
  return (
    <main id="main" className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-night text-white">
      <Image src="/brand/dar-city.webp" alt="" fill priority sizes="100vw" className="object-cover object-[50%_60%]" />
      {/* Deep green at the top for the logo, city in the middle, dark again for the buttons. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-night via-night/55 to-night/95" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-6">
        <div className="flex justify-end">
          <LanguageSwitcher tone="dark" />
        </div>
        <div className="mt-10 flex flex-col items-center text-center sm:mt-16">
          <Logo tone="light" href="/" tagline size="xl" />
          <p className="mt-5 text-sm font-semibold tracking-wide text-white/90">Kununua · Kupeleka · Kufaidika</p>
          <p className="mt-4 max-w-xs text-base text-white/85 drop-shadow">{t.splash.promise}</p>
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <ButtonLink href="/welcome" variant="gold" size="lg" full>{t.splash.getStarted}</ButtonLink>
          <ButtonLink href="/sign-in" variant="glass" size="lg" full>{t.splash.login}</ButtonLink>
        </div>
      </div>
    </main>
  );
}
