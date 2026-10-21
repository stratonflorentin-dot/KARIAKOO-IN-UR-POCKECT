import { Bike, Store, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/AuthForm";
import { Notice } from "@/components/ui/States";

export const metadata: Metadata = { title: "Sign in" };

// Reads ?as= to show the customer, seller or rider login.
export const instant = false;

const LOGINS = {
  customer: {
    greeting: "Karibu Tena!",
    intro: "Sign in to shop, track your orders and more.",
    title: "Customer Login",
    subtitle: "Shop products, track orders and more",
    Icon: User,
    footer: { lead: "No account yet?", label: "Sign up as a customer", href: "/sign-up" },
  },
  seller: {
    greeting: "Karibu Mfanyabiashara!",
    intro: "Sign in to manage your shop.",
    title: "Seller Login",
    subtitle: "Your shop, products and orders",
    Icon: Store,
    footer: { lead: "No shop yet?", label: "Apply to sell", href: "/apply/seller" },
  },
  rider: {
    greeting: "Karibu, Dereva!",
    intro: "Sign in to pick up delivery jobs.",
    title: "Rider Login",
    subtitle: "Take jobs, deliver orders, track earnings",
    Icon: Bike,
    footer: { lead: "Not a rider yet?", label: "Apply to ride", href: "/apply/rider" },
  },
} as const;

type LoginRole = keyof typeof LOGINS;

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const as: LoginRole = params.as === "seller" || params.as === "rider" ? params.as : "customer";
  const login = LOGINS[as];
  const others = (Object.keys(LOGINS) as LoginRole[]).filter((r) => r !== as);

  return (
    <AuthShell greeting={login.greeting} intro={login.intro} title={login.title} subtitle={login.subtitle} icon={<login.Icon size={22} aria-hidden="true" />}>
      {params.error === "link" && (
        <div className="mb-4"><Notice tone="warning">That link has expired or was already used. Request a new one.</Notice></div>
      )}
      <SignInForm as={as} />
      <p className="mt-5 text-center text-sm text-muted">
        {login.footer.lead}{" "}
        <Link href={login.footer.href} className="font-semibold text-brand-700 hover:underline">{login.footer.label}</Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        {others.map((r, i) => (
          <span key={r}>
            {i > 0 && " · "}
            <Link href={r === "customer" ? "/sign-in" : `/sign-in?as=${r}`} className="font-medium text-ink underline-offset-2 hover:underline">
              {LOGINS[r].title}
            </Link>
          </span>
        ))}
      </p>
    </AuthShell>
  );
}
