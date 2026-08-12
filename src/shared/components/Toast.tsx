"use client";

import { useEffect, useRef } from "react";

import { feedbackTexts } from "@/src/shared/constants/texts";

/**
 * Toast operacional local (sem provider global na v1).
 *
 * O componente é controlado: quem renderiza decide quando `message` existe e
 * recebe `onDismiss` para limpar. Assim o feedback nasce do resultado da Server
 * Action e não de um timer artificial (tech_spec §5.2).
 *
 * Acessibilidade: sucesso usa `role="status"` (`polite`), erro usa
 * `role="alert"` (`assertive`), e há sempre ação explícita de fechar — texto,
 * não só cor (`design.md` §9).
 */

type ToastVariant = "success" | "error";

type ToastProps = {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  /** Tempo até o fechamento automático; `0` desativa. */
  durationMs?: number;
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: "border-(--color-success) bg-(--color-surface-2)",
  error: "border-(--color-danger) bg-(--color-surface-2)",
};

export function Toast({
  message,
  variant = "success",
  onDismiss,
  durationMs = 5000,
}: ToastProps) {
  // `onDismiss` fica em ref para não entrar nas dependências do efeito: um
  // callback recriado a cada render reiniciaria o timer indefinidamente e o
  // toast nunca fecharia sozinho.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (durationMs <= 0) return;

    const timer = setTimeout(() => onDismissRef.current(), durationMs);
    // Libera o timer ao desmontar ou ao trocar a mensagem: sem isso um toast
    // antigo fecharia o novo.
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={
        "fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 " +
        "text-sm text-(--color-foreground) shadow-lg sm:left-auto sm:right-4 sm:w-96 " +
        VARIANT_CLASS[variant]
      }
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={
          "min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-(--color-muted) " +
          "hover:text-(--color-foreground) " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
        }
      >
        {feedbackTexts.acaoFechar}
      </button>
    </div>
  );
}
