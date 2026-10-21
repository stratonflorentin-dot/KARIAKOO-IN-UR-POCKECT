import Link from "@/components/i18n/Link";
import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";

export default async function NotFound() {
  const t = await getDictionary();
  return (
    <main id="main" className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold tracking-tight">{t.notFound.title}</h1>
      <p className="mt-2 text-muted">{t.notFound.body}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/customer" className="inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">
          {t.notFound.home}
        </Link>
        <Link href="/customer/search" className="inline-flex h-12 items-center rounded-full border border-line px-6 font-semibold hover:border-brand-200">
          {t.notFound.search}
        </Link>
      </div>
    </main>
  );
}
