import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  labels: { previous: string; next: string; summary: string };
};

const base = "inline-flex min-h-11 items-center rounded-md border px-4 text-sm";

export function Pagination({ page, pages, hrefFor, labels }: Props) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-2" aria-label={labels.summary}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(base, "hover:bg-muted")}>
          {labels.previous}
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(base, "opacity-50")}>
          {labels.previous}
        </span>
      )}
      <span className="text-sm text-muted-foreground">{labels.summary}</span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={cn(base, "hover:bg-muted")}>
          {labels.next}
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(base, "opacity-50")}>
          {labels.next}
        </span>
      )}
    </nav>
  );
}
