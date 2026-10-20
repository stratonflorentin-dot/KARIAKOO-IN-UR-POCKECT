import { Bike, Headset, ShieldCheck, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Logo } from "@/components/ui/Logo";
import { SearchBar } from "@/components/ui/SearchBar";
import { getCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "KARIAKOO — now closer to you",
  description: "Shop Kariakoo's trusted shops online: fashion, electronics, food and home essentials, delivered across Dar es Salaam.",
};

const trust = [
  { Icon: ShieldCheck, title: "Clear order updates", hint: "See each step as it happens" },
  { Icon: Bike, title: "Doorstep delivery", hint: "A rider brings your order" },
  { Icon: Store, title: "Approved shops", hint: "Local sellers in one store" },
  { Icon: Headset, title: "Order support", hint: "Help for your purchase" },
];

/** Public splash / welcome screen: the app's front door before choosing a role. */
export default function LandingPage() {
  const categories = getCategories().slice(0, 6);

  return (
    <main id="main" className="flex-1 bg-surface">
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(16,185,129,0.55),transparent_60%),radial-gradient(40rem_25rem_at_-10%_110%,rgba(245,190,30,0.25),transparent_60%)]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,#fff_0_2px,transparent_2px_22px)]" />
        <div className="relative mx-auto max-w-2xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
          <div className="flex items-center justify-between">
            <Logo tone="light" href="/" tagline />
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">Dar es Salaam</span>
          </div>

          <p className="mt-10 text-sm font-semibold text-gold-300">Shop · Order · Deliver</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Shop Kariakoo.
            <br />
            Get it <span className="text-gold-400">delivered</span>.
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/75">
            Explore products from local shops, place an order in one store, and follow its journey to your door.
          </p>

          <div className="mt-6">
            <SearchBar variant="glass" id="landing-search" />
          </div>

          <nav aria-label="Popular categories" className="-mx-4 mt-6 sm:mx-0">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
              {categories.map((c) => (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/customer/category/${c.slug}`}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 pl-1.5 pr-4 text-sm font-medium text-white backdrop-blur-md transition hover:border-gold-400/60 hover:bg-white/15"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                      <CategoryIcon slug={c.slug} size={16} />
                    </span>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <ButtonLink href="/customer" variant="gold" size="lg" full>
              Start shopping →
            </ButtonLink>
            <ButtonLink href="/welcome" variant="glass" size="lg" full>
              Choose how you&apos;ll use Kariakoo
            </ButtonLink>
          </div>
        </div>

        {/* Gold skyline flourish along the bottom, like the mockup. */}
        <div aria-hidden="true" className="relative h-6 bg-gold-400/90" style={{ clipPath: "polygon(0 100%, 0 40%, 8% 55%, 14% 20%, 22% 55%, 30% 30%, 40% 60%, 50% 25%, 60% 58%, 70% 35%, 80% 60%, 90% 30%, 100% 55%, 100% 100%)" }} />
      </section>

      <section aria-labelledby="why-heading" className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h2 id="why-heading" className="sr-only">Why KARIAKOO</h2>
        <ul className="grid grid-cols-2 gap-3">
          {trust.map(({ Icon, title, hint }) => (
            <li key={title} className="rounded-3xl border border-line bg-white p-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="text-sm text-muted">{hint}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-3xl bg-brand-50 p-5 text-center">
          <p className="text-lg font-bold text-brand-900">Kariakoo, made more accessible.</p>
          <p className="mt-1 text-sm text-brand-800">Browse local shops, find what you need, and keep your order in view.</p>
          <ButtonLink href="/welcome" variant="primary" size="lg" className="mt-4">
            Get started
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
