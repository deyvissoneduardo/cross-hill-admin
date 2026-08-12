import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession, signInAdmin } from "@/src/features/admin/auth";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { adminTexts } from "@/src/shared/constants/texts";

/**
 * Login administrativo (`design.md` §4.1).
 *
 * Server Component de propósito: a senha só existe no POST do formulário para a
 * Server Action, nunca em estado de cliente. O formulário funciona sem
 * JavaScript; o estado ocupado do botão vem de `useFormStatus` no `Button`.
 *
 * O feedback de erro chega por query string com código genérico — nunca com a
 * causa real — para não permitir descobrir se um e-mail existe.
 */

export const metadata: Metadata = {
  title: adminTexts.loginTitulo,
};

const ERROR_MESSAGES: Record<string, string> = {
  credenciais: adminTexts.loginFalha,
  indisponivel: adminTexts.loginIndisponivel,
  sessao: adminTexts.loginSessaoExpirada,
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  // Sessão válida não deve ver o login. A verificação é a autoritativa
  // (assinatura + revogação + e-mail do administrador), não a presença do cookie.
  if (await getAdminSession()) {
    redirect("/admin");
  }

  const { erro } = await searchParams;
  const errorCode = Array.isArray(erro) ? erro[0] : erro;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-(--color-foreground)">
          {adminTexts.loginTitulo}
        </h1>
        <p className="mt-2 text-sm text-(--color-muted)">{adminTexts.loginSubtitulo}</p>

        <form action={signInAdmin} className="mt-8 flex flex-col gap-4">
          <Field
            id="admin-email"
            name="email"
            type="email"
            label={adminTexts.loginEmailLabel}
            autoComplete="email"
            required
          />
          <Field
            id="admin-senha"
            name="senha"
            type="password"
            label={adminTexts.loginSenhaLabel}
            autoComplete="current-password"
            required
          />

          <Button type="submit" fullWidth pendingLabel={adminTexts.loginEnviando}>
            {adminTexts.loginEnviar}
          </Button>

          {errorMessage ? <FeedbackBanner message={errorMessage} /> : null}
        </form>
      </div>
    </div>
  );
}
