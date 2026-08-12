import type { ReactNode } from "react";

/**
 * Banner inline de feedback administrativo.
 *
 * `design.md` §4.1/§5 pede erro recuperável exibido no fluxo (sem tirar o
 * usuário da tela) e com ação de recuperação. É Server Component por padrão:
 * a página de login o renderiza sem custo de JS no cliente.
 *
 * Acessibilidade: erro usa `role="alert"`; sucesso/informação usam
 * `role="status"`. A variante nunca é comunicada apenas por cor — o texto da
 * mensagem carrega o significado (`design.md` §9).
 */

type FeedbackVariant = "error" | "success" | "info";

type FeedbackBannerProps = {
  message: string;
  variant?: FeedbackVariant;
  /** Ação de recuperação, ex.: botão "Tentar novamente". */
  action?: ReactNode;
};

const VARIANT_CLASS: Record<FeedbackVariant, string> = {
  error: "border-(--color-danger) text-(--color-danger)",
  success: "border-(--color-success) text-(--color-success)",
  info: "border-(--color-border-strong) text-(--color-muted)",
};

export function FeedbackBanner({
  message,
  variant = "error",
  action,
}: FeedbackBannerProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={
        "flex flex-col gap-3 rounded-lg border bg-(--color-surface-2) px-4 py-3 text-sm " +
        "sm:flex-row sm:items-center sm:justify-between " +
        VARIANT_CLASS[variant]
      }
    >
      <span>{message}</span>
      {action}
    </div>
  );
}
