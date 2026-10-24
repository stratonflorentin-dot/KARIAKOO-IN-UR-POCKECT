import { Suspense } from "react";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CustomerFooter } from "@/components/customer/CustomerFooter";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { IncomingDeliveryCallNotice } from "@/components/orders/IncomingDeliveryCallNotice";

export default function CustomerLayout({ children }: LayoutProps<"/[lang]/customer">) {
  return (
    <>
      <CustomerHeader />
      <main id="main" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>
      <CustomerFooter />
      <Suspense fallback={null}>
        <IncomingDeliveryCallNotice />
      </Suspense>
      <Suspense fallback={null}>
        <CustomerBottomNav />
      </Suspense>
    </>
  );
}
