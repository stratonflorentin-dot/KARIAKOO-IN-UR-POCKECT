import { Suspense } from "react";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CustomerFooter } from "@/components/customer/CustomerFooter";
import { CustomerHeader } from "@/components/customer/CustomerHeader";

export default function CustomerLayout({ children }: LayoutProps<"/customer">) {
  return (
    <>
      <CustomerHeader />
      <main id="main" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>
      <CustomerFooter />
      <Suspense fallback={null}>
        <CustomerBottomNav />
      </Suspense>
    </>
  );
}
