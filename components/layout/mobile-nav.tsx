"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Props = { title: string; menuLabel: string; children: React.ReactNode };

// Hamburger drawer for screens below `md`. It remembers the path it was opened on, so it closes
// by itself once navigation changes the path (no effect needed).
export function MobileNav({ title, menuLabel, children }: Props) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenedOn(next ? pathname : null)}>
      <SheetTrigger render={<Button variant="outline" aria-label={menuLabel} className="size-11 p-0" />}>
        <Menu aria-hidden className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-lg">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
