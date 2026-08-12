import Link from "next/link";
import type { ReactNode } from "react";

import { assertAdminSession, signOutAdmin } from "@/src/features/admin/auth";
import { Button } from "@/src/shared/components/Button";
import { adminTexts } from "@/src/shared/constants/texts";

/**
 * Shell das telas administrativas.
 *
 * É o ponto onde a sessão é exigida: `assertAdminSession()` roda ANTES de
 * qualquer conteúdo ser renderizado, então uma pessoa sem sessão válida é
 * levada ao login sem que dado administrativo algum seja produzido. Cada página
 * que carrega dados deve exigir a sessão por conta própria também — o shell
 * protege a renderização, não a busca de dados feita por outros componentes
 * (guia local `01-app/02-guides/authentication.md`).
 *
 * Layout conforme `design.md` §4.2: cabeçalho com título e ação secundária,
 * navegação interna preservada entre telas e conteúdo em uma coluna no mobile.
 */

const CONTENT_ID = "conteudo-admin";

const NAV_ITEMS = [
  { href: "/admin", label: adminTexts.navDashboard },
  { href: "/admin/agenda", label: adminTexts.navAgenda },
  { href: "/admin/configuracoes/aparencia", label: adminTexts.navAparencia },
  { href: "/admin/configuracoes/agendamento", label: adminTexts.navPosAgendamento },
] as const;

type AdminShellProps = {
  title: string;
  /** Ação secundária do cabeçalho, ex.: "Atualizar". */
  actions?: ReactNode;
  /** Resumo por status exibido abaixo do título. */
  summary?: ReactNode;
  children: ReactNode;
};

export async function AdminShell({
  title,
  actions,
  summary,
  children,
}: AdminShellProps) {
  const session = await assertAdminSession();

  return (
    <div className="flex min-h-full flex-col">
      <a
        href={`#${CONTENT_ID}`}
        className={
          "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 " +
          "focus:rounded-lg focus:bg-(--color-surface-2) focus:px-4 focus:py-2 focus:text-sm"
        }
      >
        {adminTexts.pularParaConteudo}
      </a>

      <header className="border-b border-(--color-border) bg-(--color-surface)">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-(--color-muted)">
                {adminTexts.areaTitulo}
              </span>
              <h1 className="text-xl font-semibold text-(--color-foreground)">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {actions}
              <form action={signOutAdmin}>
                <Button type="submit" variant="secondary">
                  {adminTexts.sairAcao}
                </Button>
              </form>
            </div>
          </div>

          {summary}

          <nav aria-label={adminTexts.areaTitulo}>
            <ul className="flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      "inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-(--color-muted) " +
                      "transition-colors duration-150 ease-out motion-reduce:transition-none " +
                      "hover:bg-(--color-surface-2) hover:text-(--color-foreground) " +
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id={CONTENT_ID}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6"
      >
        {children}
      </main>

      <footer className="border-t border-(--color-border) px-4 py-3 text-xs text-(--color-muted) sm:px-6">
        <span className="mx-auto block w-full max-w-6xl">{session.email}</span>
      </footer>
    </div>
  );
}
