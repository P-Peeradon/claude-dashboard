import { CircleCheck, CircleX, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "PAID" | "PENDING" | "CANCELLED";

const styles: Record<Status, { icon: typeof Clock; className: string }> = {
  PAID: { icon: CircleCheck, className: "border-emerald-600/30 text-emerald-700 dark:text-emerald-400" },
  PENDING: { icon: Clock, className: "border-amber-600/30 text-amber-700 dark:text-amber-400" },
  CANCELLED: { icon: CircleX, className: "border-destructive/30 text-destructive" },
};

// Status never relies on color alone: every state carries an icon and a label.
export function StatusBadge({ status, label }: { status: Status; label: string }) {
  const { icon: Icon, className } = styles[status];
  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </Badge>
  );
}
