"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  lang: string;
  labels: {
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
    errors: Record<NonNullable<LoginState["error"]>, string>;
  };
};

export function LoginForm({ lang, labels }: Props) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {labels.errors[state.error]}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? labels.signingIn : labels.signIn}
      </Button>
    </form>
  );
}
