import { LangSwitcher } from "@/components/layout/lang-switcher";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

export default async function LoginPage() {
  const [lang, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-4">
      <div className="text-center text-2xl font-semibold">{dict.common.appName}</div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{dict.auth.loginTitle}</CardTitle>
          <CardDescription>{dict.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            lang={lang}
            labels={{
              email: dict.auth.email,
              password: dict.auth.password,
              signIn: dict.auth.signIn,
              signingIn: dict.auth.signingIn,
              errors: {
                invalidCredentials: dict.auth.invalidCredentials,
                tooManyAttempts: dict.auth.tooManyAttempts,
                required: dict.errors.required,
              },
            }}
          />
        </CardContent>
      </Card>
      <div className="flex justify-center">
        <LangSwitcher lang={lang} label={dict.common.language} />
      </div>
    </main>
  );
}
