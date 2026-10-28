"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { clearFailures, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: "invalidCredentials" | "tooManyAttempts" | "required" };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: string | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const langValue = String(formData.get("lang") ?? "");
  const lang = hasLocale(langValue) ? langValue : defaultLocale;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "required" };
  const { email, password } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limiterKey = `${ip}:${email}`;
  if (isRateLimited(limiterKey)) return { error: "tooManyAttempts" };

  const user = await prisma.user.findUnique({ where: { email } });
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !valid) {
    recordFailure(limiterKey);
    return { error: "invalidCredentials" };
  }

  clearFailures(limiterKey);
  await createSession(user.id);
  redirect(`/${lang}/dashboard`);
}

export async function logout(formData: FormData) {
  const langValue = String(formData.get("lang") ?? "");
  const lang = hasLocale(langValue) ? langValue : defaultLocale;
  await destroySession();
  redirect(`/${lang}/login`);
}
