import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find that page, product or shop. It may have been removed.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/customer" className="inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">
          Go home
        </Link>
        <Link href="/customer/search" className="inline-flex h-12 items-center rounded-full border border-line px-6 font-semibold hover:border-brand-200">
          Search
        </Link>
      </div>
    </main>
  );
}
