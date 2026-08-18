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
import { Toast } from "@/src/shared/components/Toast";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { isIsoDate, todayIsoDate } from "@/src/shared/time";

type PeriodFilter = "todos" | "dia" | "semana";

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
  const [comunicacoesDosCards, setComunicacoesDosCards] = useState<
    Record<string, CustomerCommunication>
  >({});
  const [toast, setToast] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<PeriodFilter>("todos");
  const [dataReferencia, setDataReferencia] = useState(todayIsoDate);

  const filtrados = filterAppointmentsByPeriod(
    agendamentos,
    periodo,
    dataReferencia,
  );

  const handleActionSuccess = useCallback(
    (agendamento: AppointmentDTO, acao: CustomerMessageAction) => {
      setToast(agendamentoTexts.acaoConcluida);
      const novaComunicacao = buildCommunication(agendamento, acao);

      if (novaComunicacao !== null) {
        setComunicacoesDosCards((atuais) => ({
          ...atuais,
          [agendamento.id]: novaComunicacao,
        }));
      }
    },
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-2) p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="agendamentos-filtro-periodo"
            className="text-sm font-medium text-(--color-foreground)"
          >
            {agendamentoTexts.filtroPeriodoLabel}
          </label>
          <select
            id="agendamentos-filtro-periodo"
            value={periodo}
            onChange={(event) => setPeriodo(event.currentTarget.value as PeriodFilter)}
            className="min-h-11 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 text-sm text-(--color-foreground) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
          >
            <option value="todos">{agendamentoTexts.filtroTodos}</option>
            <option value="dia">{agendamentoTexts.filtroDia}</option>
            <option value="semana">{agendamentoTexts.filtroSemana}</option>
          </select>
        </div>

        {periodo === "todos" ? null : (
          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="agendamentos-filtro-data"
              className="text-sm font-medium text-(--color-foreground)"
            >
              {agendamentoTexts.filtroDataLabel}
            </label>
            <input
              id="agendamentos-filtro-data"
              type="date"
              value={dataReferencia}
              onChange={(event) => setDataReferencia(event.currentTarget.value)}
              className="min-h-11 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 text-sm text-(--color-foreground) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
            />
          </div>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div
          className={
            "flex flex-col items-center gap-3 rounded-lg border border-(--color-border) " +
            "bg-(--color-surface-2) px-4 py-10 text-center"
          }
        >
          <p className="text-sm text-(--color-muted)">
            {agendamentos.length === 0
              ? feedbackTexts.listaVaziaAgendamentos
              : agendamentoTexts.filtroSemResultados}
          </p>
          {agendamentos.length === 0 ? emptyAction : null}
        </div>
      ) : (
        <ul className={APPOINTMENT_GRID_CLASS}>
          {filtrados.map((agendamento) => (
            <li key={agendamento.id} className="flex">
              <AppointmentCard
                agendamento={agendamento}
                confirmAction={confirmAction}
                cancelAction={cancelAction}
                listAvailableAction={listAvailableAction}
                rescheduleAction={rescheduleAction}
                onActionSuccess={handleActionSuccess}
                onEditSuccess={() => setToast(agendamentoTexts.acaoConcluida)}
                whatsappUrl={comunicacoesDosCards[agendamento.id]?.url}
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

export function filterAppointmentsByPeriod(
  appointments: readonly AppointmentDTO[],
  period: PeriodFilter,
  referenceDate: string,
): AppointmentDTO[] {
  if (period === "todos") return [...appointments];
  if (period === "dia") {
    return appointments.filter((appointment) => appointment.data === referenceDate);
  }
  if (!isIsoDate(referenceDate)) return [];

  const [weekStart, weekEnd] = getIsoWeekBounds(referenceDate);
  return appointments.filter(
    (appointment) => appointment.data >= weekStart && appointment.data <= weekEnd,
  );
}

/** Retorna segunda e domingo da semana sem depender do fuso do navegador. */
function getIsoWeekBounds(isoDate: string): [string, string] {
  const reference = new Date(`${isoDate}T00:00:00.000Z`);
  const dayFromMonday = (reference.getUTCDay() + 6) % 7;
  const monday = new Date(reference);
  monday.setUTCDate(reference.getUTCDate() - dayFromMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
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
