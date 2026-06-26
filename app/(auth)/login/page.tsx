import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { getOptionalSession } from "@/lib/auth/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/copy";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getOptionalSession();
  if (session) {
    redirect("/dashboard");
  }

  const { next } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8">
          <header className="grid gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
              {APP_NAME}
            </p>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{APP_TAGLINE}</p>
          </header>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}

