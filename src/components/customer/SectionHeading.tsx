import { ArrowRight } from "lucide-react";
import Link from "@/components/i18n/Link";

export function SectionHeading({ title, subtitle, href, linkLabel = "View all", id }: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-brand-300 hover:text-brand-700">
          {linkLabel} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
