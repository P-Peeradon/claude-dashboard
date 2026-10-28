import { notFound } from "next/navigation";

// Catches any unknown path under /{lang}/... so the 404 renders inside the localized layout.
export default function CatchAll() {
  notFound();
}
