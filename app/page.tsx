import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession, signInAdmin } from "@/src/features/admin/auth";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { PasswordField } from "@/src/features/admin/components/PasswordField";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { adminTexts } from "@/src/shared/constants/texts";

export const metadata: Metadata = {
  title: adminTexts.loginTitulo,
};

const ERROR_MESSAGES: Record<string, string> = {
  credenciais: adminTexts.loginFalha,
  indisponivel: adminTexts.loginIndisponivel,
  sessao: adminTexts.loginSessaoExpirada,
};

/**
 * Entrada da aplicação: login do administrador.
 *
 * Uma sessão válida segue imediatamente para o painel em `/admin`. A senha é
 * enviada somente para a Server Action e nunca é mantida em estado de cliente.
 */
export default async function AdminLoginPage({ searchParams }: PageProps<"/">) {
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
          <PasswordField
            id="admin-senha"
            name="senha"
            label={adminTexts.loginSenhaLabel}
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
