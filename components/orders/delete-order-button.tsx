"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteOrder } from "@/actions/orders";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  lang: string;
  /** Where to go after deleting (e.g. from the edit page); omit to just refresh the list. */
  redirectTo?: string;
  labels: { delete: string; cancel: string; title: string; description: string; done: string; error: string };
};

export function DeleteOrderButton({ id, lang, redirectTo, labels }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteOrder(id, lang);
        toast.success(labels.done);
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch {
        toast.error(labels.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" className="h-11 text-destructive" />}>
        <Trash2 aria-hidden className="size-4" />
        {labels.delete}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription>{labels.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{labels.cancel}</AlertDialogCancel>
          <Button variant="destructive" className="h-11" disabled={pending} onClick={confirmDelete}>
            {labels.delete}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
