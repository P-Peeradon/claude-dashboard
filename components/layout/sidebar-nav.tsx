"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

type Key = "dashboard" | "orders" | "newOrder";

const icons = { dashboard: LayoutDashboard, orders: ReceiptText, newOrder: Plus } as const;
const paths: Record<Key, string> = { dashboard: "dashboard", orders: "orders", newOrder: "orders/new" };

export function SidebarNav({ lang, items }: { lang: string; items: { key: Key; label: string }[] }) {
  const pathname = usePathname();

  const isActive = (key: Key) => {
    const href = `/${lang}/${paths[key]}`;
    if (key === "orders") return pathname.startsWith(href) && !pathname.startsWith(`/${lang}/orders/new`);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ key, label }) => {
        const Icon = icons[key];
        const active = isActive(key);
        return (
          <Link
            key={key}
            href={`/${lang}/${paths[key]}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
