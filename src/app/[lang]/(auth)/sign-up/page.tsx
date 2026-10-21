import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "@/components/i18n/Link";
import { Skeleton } from "@/components/ui/States";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.signUp.pageTitle };
}

export default async function SignUpPage({ searchParams }: PageProps<"/[lang]/sign-up">) {
  const t = await getDictionary();
  const copy = t.auth.signUp;
  return (
    <AuthShell greeting={copy.greeting} intro={copy.intro} title={copy.title} subtitle={copy.subtitle} icon={<UserPlus size={22} aria-hidden="true" />}>
      <Suspense fallback={<SignUpFallback />}>
        <SignUpOptions searchParams={searchParams} t={t} />
      </Suspense>
    </AuthShell>
  );
}

async function SignUpOptions({
  searchParams,
  t,
}: {
  searchParams: PageProps<"/[lang]/sign-up">["searchParams"];
  t: Dictionary;
}) {
  const params = await searchParams;
  const as = params.as === "seller" || params.as === "rider" ? params.as : "customer";
  const copy = t.auth.signUp;

  return (
    <>
      <GoogleSignInButton as={as} />
      <div className="my-4 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />{t.auth.orWithEmail}<span className="h-px flex-1 bg-line" />
      </div>
      <SignUpForm as={as} />
      <p className="mt-5 text-center text-sm text-muted">
        {copy.haveAccount}{" "}
        <Link href={as === "customer" ? "/sign-in" : `/sign-in?as=${as}`} className="font-semibold text-brand-700 hover:underline">{t.auth.signIn}</Link>
      </p>
    </>
  );
}

function SignUpFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading sign-up options">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-28 mx-auto" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
