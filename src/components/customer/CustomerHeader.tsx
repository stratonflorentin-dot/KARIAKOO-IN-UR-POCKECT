import { ClipboardList, LayoutGrid, Store, User } from "lucide-react";
import Link from "@/components/i18n/Link";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { SearchBar } from "@/components/ui/SearchBar";
import { getDictionary } from "@/i18n/server";
import { CartLink } from "./CartLink";
import { LocationSelector } from "./LocationSelector";

const navLink = "hidden h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink hover:bg-subtle md:inline-flex";

export async function CustomerHeader() {
  const t = await getDictionary();
  const links = [
    { href: "/customer/categories", label: t.nav.categories, Icon: LayoutGrid },
    { href: "/customer/shops", label: t.nav.shops, Icon: Store },
    { href: "/customer/orders", label: t.nav.orders, Icon: ClipboardList },
    { href: "/customer/profile", label: t.nav.account, Icon: User },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBar id="header-search" />
        </div>
        <nav aria-label={t.nav.mainNav} className="ml-auto flex items-center gap-0.5 md:ml-0">
          {links.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={navLink}>
              <Icon size={18} aria-hidden="true" /> <span className="hidden lg:inline">{label}</span>
              <span className="sr-only lg:hidden">{label}</span>
            </Link>
          ))}
          <CartLink />
        </nav>
      </div>
      <div className="border-t border-line bg-subtle">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <LocationSelector />
          <div className="flex shrink-0 items-center gap-3">
            <nav aria-label={t.nav.departmentsNav} className="hidden items-center gap-3 text-xs font-semibold sm:flex">
              <Link href="/customer/department/men" className="hover:text-brand-700">{t.nav.men}</Link>
              <Link href="/customer/department/women" className="hover:text-brand-700">{t.nav.women}</Link>
              <Link href="/customer/department/kids" className="hover:text-brand-700">{t.nav.kids}</Link>
              <Link href="/seller" className="hidden font-medium text-muted hover:text-brand-700 lg:inline">{t.nav.sell}</Link>
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
