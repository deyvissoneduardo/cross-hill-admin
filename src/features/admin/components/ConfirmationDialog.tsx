"use client";

import { useEffect, useId, useRef } from "react";

import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { Button } from "@/src/shared/components/Button";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { type AppErrorCode } from "@/src/shared/errors";

/**
 * Dialog de confirmação de ação administrativa (`design.md` §4.6).
 *
 * Existe para impedir mutação acidental: nenhuma ação administrativa é
 * registrada sem passar por aqui. É controlado — quem renderiza decide quando
 * está aberto e o que acontece em `onConfirm`/`onCancel` — para que o resultado
 * da Server Action, e não um timer, governe o fechamento (tech_spec §5.2).
 *
 * Não usa `<dialog>` nativo: `showModal()` não existe no ambiente de teste
 * (jsdom 30) e o elemento traria gestão de foco que teríamos de contornar. A
 * semântica é dada explicitamente por `role="dialog"` + `aria-modal`, com foco
 * movido para o painel na abertura e `Escape` fechando enquanto não há ação em
 * curso (`design.md` §5: durante o estado ocupado as demais ações ficam
 * desabilitadas).
 */

type DialogVariant = "primary" | "destructive";

type DialogError = {
  code: AppErrorCode;
  message: string;
};

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  /** Resumo do item sobre o qual a ação será aplicada. */
  summary: string;
  /** O que acontece ao confirmar — o impacto, em uma frase. */
  consequence: string;
  confirmLabel: string;
  variant?: DialogVariant;
  pending?: boolean;
  error?: DialogError | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Códigos em que repetir a ação não muda nada: o servidor já está no estado
 * final (confirmação duplicada, agendamento inexistente). Oferecer "Tentar
 * novamente" aqui convidaria o administrador a um loop — o design pede apenas
 * "Entendi" (§5.1).
 */
const CODIGOS_SEM_RETENTATIVA: readonly AppErrorCode[] = ["conflict", "not_found"];

export function ConfirmationDialog({
  open,
  title,
  summary,
  consequence,
  confirmLabel,
  variant = "primary",
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open || pending) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    // Sem remover o listener, cada abertura acumularia um handler sobre um
    // dialog que já não está na tela.
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, pending, onCancel]);

  if (!open) {
    return null;
  }

  const semRetentativa = error !== null && CODIGOS_SEM_RETENTATIVA.includes(error.code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={
          "flex w-full max-w-md flex-col gap-4 rounded-lg border border-(--color-border) " +
          "bg-(--color-surface-2) p-6 shadow-lg"
        }
      >
        <h2 id={titleId} className="text-lg font-semibold text-(--color-foreground)">
          {title}
        </h2>

        <div id={descriptionId} className="flex flex-col gap-2 text-sm">
          <p className="text-(--color-foreground)">{summary}</p>
          <p className="text-(--color-muted)">{consequence}</p>
        </div>

        {error === null ? null : <FeedbackBanner message={error.message} />}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {semRetentativa ? (
            <Button onClick={onCancel}>{feedbackTexts.acaoEntendi}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onCancel} disabled={pending}>
                {agendamentoTexts.dialogVoltar}
              </Button>
              <Button variant={variant} onClick={onConfirm} pending={pending}>
                {error === null ? confirmLabel : feedbackTexts.acaoTentarNovamente}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
