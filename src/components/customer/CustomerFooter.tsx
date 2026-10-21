import { CatalogSourceNote } from "@/components/CatalogSourceNote";
import Link from "@/components/i18n/Link";
import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";

export async function CustomerFooter() {
  const t = (await getDictionary()).footer;
  return (
    <footer className="mt-16 bg-night pb-28 pt-12 text-white/70 md:pb-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-3 max-w-md text-sm leading-6">{t.blurb}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{t.shop}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/customer/categories">{t.allCategories}</Link></li>
            <li><Link className="hover:text-white" href="/customer/shops">{t.allShops}</Link></li>
            <li><Link className="hover:text-white" href="/customer/search">{t.search}</Link></li>
            <li><Link className="hover:text-white" href="/customer/orders">{t.myOrders}</Link></li>
            <li><Link className="hover:text-white" href="/customer/support">{t.help}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{t.work}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/seller">{t.business}</Link></li>
            <li><Link className="hover:text-white" href="/rider">{t.riders}</Link></li>
            <li><Link className="hover:text-white" href="/welcome">{t.chooseRole}</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl space-y-1 px-4 sm:px-6">
        <CatalogSourceNote />
      </div>
    </footer>
  );
}
