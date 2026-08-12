import type { Metadata } from "next";

import { adminTexts } from "@/src/shared/constants/texts";

/**
 * Base visual das rotas administrativas.
 *
 * Por que este layout NÃO faz a checagem de sessão: o guia local do Next
 * (`01-app/02-guides/authentication.md`) é explícito — um layout não controla se
 * o resto da rota renderiza e não re-executa a cada navegação, logo não é
 * fronteira de segurança. Além disso `/admin/login` é filho deste layout: um
 * redirect aqui apontaria para uma rota que ele mesmo bloquearia.
 *
 * O bloqueio real vem de duas camadas:
 * - `proxy.ts` — barra qualquer requisição a `/admin/*` (exceto o login) sem
 *   cookie de sessão, antes do roteamento;
 * - `assertAdminSession()` — verificação autoritativa em `AdminShell`, em cada
 *   página administrativa e em cada Server Action.
 */

export const metadata: Metadata = {
  title: {
    default: adminTexts.areaTitulo,
    template: `%s · ${adminTexts.areaTitulo}`,
  },
  // Superfície administrativa nunca deve ser indexada.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-(--color-background)">{children}</div>
  );
}
