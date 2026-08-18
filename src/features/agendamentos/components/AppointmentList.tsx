"use client";

import { useCallback, useState, type ReactNode } from "react";

import {
  AppointmentCard,
  type AppointmentActionFn,
  type AvailabilityActionFn,
  type RescheduleAppointmentActionFn,
} from "@/src/features/agendamentos/components/AppointmentCard";
import { APPOINTMENT_GRID_CLASS } from "@/src/features/agendamentos/components/appointmentListLayout";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import {
  buildCustomerMessage,
  buildWhatsAppUrl,
  type CustomerMessageAction,
} from "@/src/features/whatsapp/whatsappService";
import { Button } from "@/src/shared/components/Button";
import { Toast } from "@/src/shared/components/Toast";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";

/**
 * Listagem operacional do painel (`design.md` §4.2 e §5).
 *
 * Dois motivos para ser Client Component, e não um `map` no Server Component:
 *
 * 1. O feedback de uma ação precisa sobreviver ao card. Cancelar remove o
 *    agendamento da listagem ativa, então um toast ou uma mensagem para o
 *    cliente guardados dentro do card sumiriam junto com ele.
 * 2. A mensagem de comunicação (PRD CA-06) é montada a partir do agendamento
 *    devolvido pela ação — o estado nasce do resultado da Server Action, não de
 *    um timer (tech_spec §5.2).
 */

type AppointmentListProps = {
  agendamentos: AppointmentDTO[];
  confirmAction: AppointmentActionFn;
  cancelAction: AppointmentActionFn;
  listAvailableAction?: AvailabilityActionFn;
  rescheduleAction?: RescheduleAppointmentActionFn;
  /** Ação de recuperação do estado vazio, ex.: "Atualizar" (`design.md` §5). */
  emptyAction?: ReactNode;
};

/** Mensagem manual para o cliente — nunca há envio automático (PRD US-04). */
type CustomerCommunication = {
  texto: string;
  /** `null` quando o agendamento não tem telefone utilizável. */
  url: string | null;
};

export function AppointmentList({
  agendamentos,
  confirmAction,
  cancelAction,
  listAvailableAction,
  rescheduleAction,
  emptyAction,
}: AppointmentListProps) {
  const [comunicacao, setComunicacao] = useState<CustomerCommunication | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Cancelado nunca entra na listagem principal (PRD CA-02). A query do
  // repository já filtra; a barreira é repetida aqui porque esta listagem é o
  // contrato visível — um cancelado que escapasse da consulta não pode reaparecer
  // na tela do administrador.
  const ativos = agendamentos.filter(
    (agendamento) => agendamento.status !== "cancelado",
  );

  const handleActionSuccess = useCallback(
    (agendamento: AppointmentDTO, acao: CustomerMessageAction) => {
      setToast(agendamentoTexts.acaoConcluida);
      setComunicacao(buildCommunication(agendamento, acao));
    },
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {comunicacao === null ? null : (
        <section
          aria-label={agendamentoTexts.comunicacaoTitulo}
          className="flex flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-2) p-4"
        >
          <h2 className="text-sm font-medium text-(--color-foreground)">
            {agendamentoTexts.comunicacaoTitulo}
          </h2>
          <p className="text-sm text-(--color-muted)">{comunicacao.texto}</p>

          <div className="flex flex-wrap items-center gap-2">
            {comunicacao.url === null ? null : (
              <a
                href={comunicacao.url}
                target="_blank"
                // A aba aberta não pode manipular esta janela (`window.opener`).
                rel="noopener noreferrer"
                className={
                  "inline-flex min-h-11 items-center rounded-lg border border-(--color-border) " +
                  "bg-(--color-surface-3) px-4 text-sm font-medium text-(--color-foreground) " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                }
              >
                {agendamentoTexts.comunicacaoAbrirConversa}
              </a>
            )}
            <Button variant="secondary" onClick={() => setComunicacao(null)}>
              {feedbackTexts.acaoFechar}
            </Button>
          </div>
        </section>
      )}

      {ativos.length === 0 ? (
        <div
          className={
            "flex flex-col items-center gap-3 rounded-lg border border-(--color-border) " +
            "bg-(--color-surface-2) px-4 py-10 text-center"
          }
        >
          <p className="text-sm text-(--color-muted)">
            {feedbackTexts.listaVaziaAgendamentos}
          </p>
          {emptyAction}
        </div>
      ) : (
        <ul className={APPOINTMENT_GRID_CLASS}>
          {ativos.map((agendamento) => (
            <li key={agendamento.id} className="flex">
              <AppointmentCard
                agendamento={agendamento}
                confirmAction={confirmAction}
                cancelAction={cancelAction}
                listAvailableAction={listAvailableAction}
                rescheduleAction={rescheduleAction}
                onActionSuccess={handleActionSuccess}
                onEditSuccess={() => setToast(agendamentoTexts.acaoConcluida)}
              />
            </li>
          ))}
        </ul>
      )}

      {toast === null ? null : (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

/**
 * Monta a mensagem manual para o cliente a partir do agendamento devolvido pela
 * ação.
 *
 * A ação JÁ foi registrada quando isto roda: um agendamento sem os dados
 * obrigatórios da mensagem não pode desfazer a confirmação nem virar erro na
 * tela — a comunicação simplesmente não é oferecida. O telefone é tratado à
 * parte porque falta só a ele para a conversa, não para o texto.
 */
function buildCommunication(
  agendamento: AppointmentDTO,
  acao: CustomerMessageAction,
): CustomerCommunication | null {
  let texto: string;

  try {
    texto = buildCustomerMessage(agendamento, acao);
  } catch {
    return null;
  }

  try {
    return { texto, url: buildWhatsAppUrl(agendamento, acao) };
  } catch {
    return { texto, url: null };
  }
}
