"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botão base do produto.
 *
 * Contrato visual (`design.md` §3.1, §8 e §9): altura mínima de 44px, raio de
 * 8px, foco visível afastado da borda e cor semântica apenas na ação
 * destrutiva. Transições são removidas sob `prefers-reduced-motion`.
 *
 * Estado ocupado: quando `pending` não é informado, o botão adota o estado do
 * `<form>` em que está (`useFormStatus`) — é o que faz o submit do login ficar
 * ocupado sem estado manual.
 */

type ButtonVariant = "primary" | "secondary" | "destructive";

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  /** Sobrescreve o estado ocupado herdado do formulário. */
  pending?: boolean;
  /** Texto acessível exibido enquanto ocupado (default: mantém o conteúdo). */
  pendingLabel?: ReactNode;
  fullWidth?: boolean;
};

const BASE_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium " +
  "transition-colors duration-150 ease-out motion-reduce:transition-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-(--color-accent) text-(--color-accent-foreground) hover:bg-(--color-accent-hover)",
  secondary:
    "border border-(--color-border) bg-(--color-surface-2) text-(--color-foreground) hover:border-(--color-border-strong)",
  destructive:
    "bg-(--color-danger-surface) text-(--color-danger-foreground) hover:bg-(--color-danger-hover)",
};

export function Button({
  variant = "primary",
  pending,
  pendingLabel,
  fullWidth = false,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const formStatus = useFormStatus();
  const isPending = pending ?? (type === "submit" && formStatus.pending);

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      className={[BASE_CLASS, VARIANT_CLASS[variant], fullWidth ? "w-full" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {isPending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
