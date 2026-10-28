import { redirect } from "next/navigation";
import { getLocale } from "@/i18n/get-dictionary";

// The proxy sends signed-out visitors to the login page, so this is only reached when signed in.
export default async function Home() {
  redirect(`/${await getLocale()}/dashboard`);
}
