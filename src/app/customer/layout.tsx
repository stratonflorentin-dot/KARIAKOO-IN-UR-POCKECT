import { Suspense } from "react";
import { DevRoleBar } from "@/components/auth/DevRoleBar";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CustomerFooter } from "@/components/customer/CustomerFooter";
import { CustomerHeader } from "@/components/customer/CustomerHeader";

export default function CustomerLayout({ children }: LayoutProps<"/customer">) {
  return (
    <>
      <Suspense fallback={null}>
        <DevRoleBar />
      </Suspense>
      <CustomerHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <CustomerFooter />
      <Suspense fallback={null}>
        <CustomerBottomNav />
      </Suspense>
    </>
  );
}
