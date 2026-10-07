import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/account/Forms";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.loginTitle, robots: { index: false } };
}

export default async function LoginPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  if (await getUser()) redirect(`/${locale}/dashboard`);
  const t = getDict(locale).account;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-3">{t.loginTitle}</h1>
      <p className="text-muted mb-8">{t.loginIntro}</p>
      <LoginForm
        locale={locale}
        labels={{
          email: t.email,
          password: t.password,
          submit: t.loginSubmit,
          invalid: t.loginError,
          rateLimit: t.rateLimited,
        }}
      />
    </div>
  );
}
