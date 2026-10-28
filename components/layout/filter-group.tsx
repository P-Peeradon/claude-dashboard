import Link from "next/link";
import { cn } from "@/lib/utils";

type Option = { label: string; href: string; active: boolean };

// Filters are plain links to the same page with different search params, so they need no client JS
// and the filtered view is shareable. One row of these sits above the charts and scopes all of them.
export function FilterGroup({ label, options }: { label: string; options: Option[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            aria-current={o.active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors",
              o.active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
