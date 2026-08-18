"use client";

import { useCallback, useState } from "react";

import { ConfirmationDialog } from "@/src/features/admin/components/ConfirmationDialog";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { APPOINTMENT_CARD_FRAME_CLASS } from "@/src/features/agendamentos/components/appointmentListLayout";
import { ConfirmationTimeline } from "@/src/features/agendamentos/components/ConfirmationTimeline";
import { EditAppointmentDialog } from "@/src/features/agendamentos/components/EditAppointmentDialog";
import { type AvailabilitySlotDTO } from "@/src/features/agenda/types";
import {
  type AppointmentDTO,
  type AppointmentStatus,
} from "@/src/features/agendamentos/types";
import {
  buildWhatsAppUrl,
  type CustomerMessageAction,
} from "@/src/features/whatsapp/whatsappService";
import { Button } from "@/src/shared/components/Button";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { type ActionResult, type AppErrorCode } from "@/src/shared/errors";
import { formatShortDatePtBr, formatTimePtBr } from "@/src/shared/time";

/**
 * Card operacional de um agendamento (`design.md` §4.2).
 *
 * Concentra o que exige ação: status, data/horário, cliente, profissional,
 * confirmações das duas partes e os botões de confirmar/cancelar. Toda mutação
 * passa por `ConfirmationDialog` — o clique no card abre o dialog e não chama
 * Server Action alguma (PRD CA-03).
 *
 * O card NÃO decide se um agendamento está confirmado: o status vem derivado no
 * DTO (PRD RN-15/RN-16). Ele apenas deixa de oferecer a confirmação quando o
 * administrador já confirmou — a barreira de verdade contra duplicidade está na
 * transação do repository, esta aqui só evita o clique inútil (PRD CA-04).
 */

/** Server Action administrativa sobre um agendamento, vista pela UI. */
export type AppointmentActionFn = (
  agendamentoId: string,
) => Promise<ActionResult<AppointmentDTO>>;

export type RescheduleAppointmentActionFn = (
  agendamentoId: string,
  data: string,
  horario: string,
) => Promise<ActionResult<AppointmentDTO>>;

export type AvailabilityActionFn = (
  isoDate: string,
) => Promise<ActionResult<AvailabilitySlotDTO[]>>;

type AppointmentCardProps = {
  agendamento: AppointmentDTO;
  confirmAction: AppointmentActionFn;
  cancelAction: AppointmentActionFn;
  listAvailableAction?: AvailabilityActionFn;
  rescheduleAction?: RescheduleAppointmentActionFn;
  /**
   * Avisa o container que a ação foi registrada, para que a comunicação com o
   * cliente sobreviva ao card (após o cancelamento ele sai da listagem).
   */
  onActionSuccess?: (agendamento: AppointmentDTO, acao: CustomerMessageAction) => void;
  onEditSuccess?: (agendamento: AppointmentDTO) => void;
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  aguardando_agendamento: agendamentoTexts.statusAguardando,
  confirmado: agendamentoTexts.statusConfirmado,
  cancelado: agendamentoTexts.statusCancelado,
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  aguardando_agendamento: "border-(--color-warning) text-(--color-warning)",
  confirmado: "border-(--color-success) text-(--color-success)",
  cancelado: "border-(--color-danger) text-(--color-danger)",
};

const DIALOG_CONTENT: Record<
  CustomerMessageAction,
  { title: string; consequence: string; confirmLabel: string; falha: string }
> = {
  confirmacao: {
    title: agendamentoTexts.confirmarDialogTitulo,
    consequence: agendamentoTexts.confirmarDialogConsequencia,
    confirmLabel: agendamentoTexts.confirmarDialogAcao,
    falha: feedbackTexts.falhaConfirmar,
  },
  cancelamento: {
    title: agendamentoTexts.cancelarDialogTitulo,
    consequence: agendamentoTexts.cancelarDialogConsequencia,
    confirmLabel: agendamentoTexts.cancelarDialogAcao,
    falha: feedbackTexts.falhaCancelar,
  },
};

export function AppointmentCard({
  agendamento,
  confirmAction,
  cancelAction,
  listAvailableAction,
  rescheduleAction,
  onActionSuccess,
  onEditSuccess,
}: AppointmentCardProps) {
  const [dialogo, setDialogo] = useState<CustomerMessageAction | null>(null);
  const [editando, setEditando] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<{ code: AppErrorCode; message: string } | null>(null);

  const tituloId = `agendamento-${agendamento.id}-cliente`;
  const dataHorario = formatDateTime(agendamento.data, agendamento.horario);
  const podeConfirmar =
    agendamento.status === "aguardando_agendamento" &&
    agendamento.adminConfirmadoEm === null;

  const abrirDialogo = useCallback((acao: CustomerMessageAction) => {
    setErro(null);
    setDialogo(acao);
  }, []);

  const fecharDialogo = useCallback(() => {
    if (pendente) {
      return;
    }

    // O erro sobrevive ao fechamento de propósito: fechado o dialog, ele passa a
    // ser o erro inline do rodapé do card (`design.md` §5) — assim o
    // administrador continua vendo por que nada aconteceu.
    setDialogo(null);
  }, [pendente]);

  const executar = useCallback(async () => {
    if (dialogo === null || pendente) {
      return;
    }

    const acao = dialogo;
    // Reserva a aba ainda dentro do gesto do usuário. Se esperássemos a Server
    // Action terminar para chamar `window.open`, navegadores poderiam bloquear
    // a conversa como popup. A URL só é atribuída depois da persistência.
    const whatsappWindow = window.open("", "_blank") ?? null;
    if (whatsappWindow !== null) {
      whatsappWindow.opener = null;
    }
    setPendente(true);
    setErro(null);

    try {
      const resultado =
        acao === "confirmacao"
          ? await confirmAction(agendamento.id)
          : await cancelAction(agendamento.id);

      if (resultado.ok) {
        const atualizado = resultado.data ?? agendamento;

        try {
          const whatsappUrl = buildWhatsAppUrl(atualizado, acao);
          if (whatsappWindow !== null) {
            whatsappWindow.location.href = whatsappUrl;
          } else {
            window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          }
        } catch {
          whatsappWindow?.close();
        }

        setDialogo(null);
        onActionSuccess?.(atualizado, acao);
        return;
      }

      whatsappWindow?.close();
      setErro({ code: resultado.code, message: resultado.message });
    } catch {
      // A Server Action pode nem chegar a devolver `ActionResult` (rede caiu,
      // sessão expirou e o POST foi redirecionado). O detalhe já está no log do
      // servidor; aqui resta a mensagem recuperável do design.
      whatsappWindow?.close();
      setErro({ code: "unavailable", message: DIALOG_CONTENT[acao].falha });
    } finally {
      setPendente(false);
    }
  }, [agendamento, cancelAction, confirmAction, dialogo, onActionSuccess, pendente]);

  const conteudoDialogo = dialogo === null ? null : DIALOG_CONTENT[dialogo];

  return (
    <article
      aria-labelledby={tituloId}
      aria-busy={pendente || undefined}
      className={
        `h-full ${APPOINTMENT_CARD_FRAME_CLASS} transition-colors duration-150 ease-out ` +
        "motion-reduce:transition-none hover:border-(--color-border-strong)"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={
            "inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium " +
            STATUS_CLASS[agendamento.status]
          }
        >
          {STATUS_LABEL[agendamento.status]}
        </span>

        <time
          dateTime={`${agendamento.data}T${agendamento.horario}`}
          className="text-base font-semibold text-(--color-foreground)"
        >
          {dataHorario}
        </time>
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 id={tituloId} className="text-base font-medium text-(--color-foreground)">
          {agendamento.cliente}
        </h3>
        <a
          href={`tel:${agendamento.telefone}`}
          className={
            "w-fit text-sm text-(--color-muted) underline-offset-4 hover:underline " +
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
          }
        >
          {agendamento.telefone}
        </a>
        <p className="text-sm text-(--color-muted)">
          {`${agendamentoTexts.profissionalRotulo}: ${agendamento.profissional}`}
        </p>
      </div>

      {pendente ? (
        <UpdatingSkeleton />
      ) : (
        <>
          <ConfirmationTimeline
            adminConfirmadoEm={agendamento.adminConfirmadoEm}
            profissionalConfirmadoEm={agendamento.profissionalConfirmadoEm}
            confirmadoPrimeiroPor={agendamento.confirmadoPrimeiroPor}
          />

          <footer className="mt-auto flex flex-col gap-3 pt-1">
            {erro !== null && dialogo === null ? (
              <FeedbackBanner message={erro.message} />
            ) : null}

            <div className="flex flex-wrap gap-2">
              {listAvailableAction && rescheduleAction ? (
                <Button variant="secondary" onClick={() => setEditando(true)}>
                  {agendamentoTexts.editarAcao}
                </Button>
              ) : null}
              <Button
                onClick={() => abrirDialogo("confirmacao")}
                disabled={!podeConfirmar}
              >
                {agendamentoTexts.confirmarAcao}
              </Button>
              <Button variant="destructive" onClick={() => abrirDialogo("cancelamento")}>
                {agendamentoTexts.cancelarAcao}
              </Button>
            </div>
          </footer>
        </>
      )}

      {conteudoDialogo === null ? null : (
        <ConfirmationDialog
          open
          title={conteudoDialogo.title}
          summary={`${agendamento.cliente} · ${dataHorario} · ${agendamento.profissional}`}
          consequence={conteudoDialogo.consequence}
          confirmLabel={conteudoDialogo.confirmLabel}
          variant={dialogo === "cancelamento" ? "destructive" : "primary"}
          pending={pendente}
          error={erro}
          onConfirm={executar}
          onCancel={fecharDialogo}
        />
      )}

      {editando && listAvailableAction && rescheduleAction ? (
        <EditAppointmentDialog
          open={editando}
          agendamento={agendamento}
          listAvailableAction={listAvailableAction}
          rescheduleAction={rescheduleAction}
          onSuccess={(atualizado) => {
            setEditando(false);
            onEditSuccess?.(atualizado);
          }}
          onCancel={() => setEditando(false)}
        />
      ) : null}
    </article>
  );
}

/**
 * Skeleton local do card enquanto a Server Action está em voo (`design.md` §5:
 * "Skeleton local quando um card está atualizando após ação").
 *
 * Cobre exatamente as regiões que a ação invalida — as linhas de confirmação e
 * as ações do rodapé: o resultado delas depende do que o servidor devolver, e
 * manter os botões clicáveis convidaria a uma segunda mutação sobre um estado
 * que já mudou. Status, data/horário e cliente permanecem visíveis porque
 * identificam o card e não mudam por causa da ação.
 */
function UpdatingSkeleton() {
  return (
    <div
      role="status"
      aria-label={agendamentoTexts.cardAtualizando}
      className="mt-auto flex flex-col gap-3"
    >
      {/* linhas de confirmação */}
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-36" />
      {/* ações */}
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}

/**
 * `2026-08-15`, `09:00` → `15/08 · 09:00`.
 *
 * Documento com data/horário fora do padrão canônico não pode derrubar o painel
 * inteiro (o repository já descarta e registra os corrompidos): o card volta aos
 * valores crus em vez de propagar a exceção do formatador.
 */
function formatDateTime(data: string, horario: string): string {
  try {
    return `${formatShortDatePtBr(data)} · ${formatTimePtBr(horario)}`;
  } catch {
    return `${data} ${horario}`.trim();
  }
}
