"use client";

import { useState } from "react";

import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import {
  availabilitySlotId,
  deriveSlotStatus,
  type AvailabilitySlotDTO,
  type AvailabilitySlotInput,
  type AvailabilitySlotStatus,
} from "@/src/features/agenda/types";
import { Button } from "@/src/shared/components/Button";
import { Toast } from "@/src/shared/components/Toast";
import { agendaTexts, dominioTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { type ActionResult } from "@/src/shared/errors";
import { formatTimePtBr, isTimeOfDay, normalizeTimeOfDay } from "@/src/shared/time";

/**
 * Grade de horários da Agenda administrativa (`design.md` §4.3, PRD US-05).
 *
 * O admin controla manualmente quais horários existem no dia: não há grade
 * fixa pré-gerada — cada horário é adicionado aqui e liberado/bloqueado antes
 * de salvar. `statusVisual` de cada slot já existente vem PRONTO do DTO
 * (`AvailabilitySlotDTO`, T2) e nunca é recalculado por este componente; a
 * única derivação feita localmente é a de um horário que o admin ACABOU de
 * adicionar e que ainda não tem DTO nenhum — e mesmo essa usa a função pura
 * `deriveSlotStatus` de T2, não uma reimplementação.
 *
 * Guarda de negócio replicada na UI (o repository já é a barreira real):
 * horário ocupado nunca tem o checkbox de "liberado" habilitado, e o
 * salvamento sempre envia `liberado: true` para ele — impedir aqui é o que
 * cumpre "slots ocupados não são editados como livres indevidamente" antes de
 * o request nem sair do navegador.
 */

/** Server Action de salvamento de disponibilidade, vista pela UI. */
export type SaveAvailabilityAction = (
  isoDate: string,
  slots: readonly AvailabilitySlotInput[],
) => Promise<ActionResult<AvailabilitySlotDTO[]>>;

type ScheduleSlotGridProps = {
  isoDate: string;
  /** Slots já persistidos da data, na ordem que devem aparecer. */
  slots: AvailabilitySlotDTO[];
  saveAction: SaveAvailabilityAction;
};

const STATUS_LABEL: Record<AvailabilitySlotStatus, string> = {
  disponivel: agendaTexts.statusDisponivel,
  ocupado: agendaTexts.statusOcupado,
  bloqueado: agendaTexts.statusBloqueado,
  inativo: agendaTexts.statusInativo,
};

const STATUS_CLASS: Record<AvailabilitySlotStatus, string> = {
  disponivel: "border-(--color-success) text-(--color-success)",
  ocupado: "border-(--color-border-strong) text-(--color-foreground)",
  bloqueado: "border-(--color-danger) text-(--color-danger)",
  inativo: "border-(--color-border) text-(--color-muted)",
};

export function ScheduleSlotGrid({ isoDate, slots, saveAction }: ScheduleSlotGridProps) {
  const [rows, setRows] = useState<AvailabilitySlotDTO[]>(() => sortByHorario(slots));
  const [novoHorario, setNovoHorario] = useState("");
  const [erroHorario, setErroHorario] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function toggleLiberado(horario: string) {
    setRows((atual) =>
      atual.map((slot) =>
        // Ocupado nunca alterna por aqui: o checkbox já está desabilitado, mas
        // a guarda fica também no handler contra qualquer disparo indevido.
        slot.horario === horario && !slot.ocupado
          ? { ...slot, liberado: !slot.liberado }
          : slot,
      ),
    );
  }

  function adicionarHorario() {
    const normalizado = normalizeTimeOfDay(novoHorario);

    if (!isTimeOfDay(normalizado)) {
      setErroHorario(dominioTexts.horarioInvalido);
      return;
    }

    if (rows.some((slot) => slot.horario === normalizado)) {
      setErroHorario(dominioTexts.horarioRepetido);
      return;
    }

    setErroHorario(null);
    setRows((atual) =>
      sortByHorario([
        ...atual,
        {
          id: availabilitySlotId(isoDate, normalizado),
          data: isoDate,
          horario: normalizado,
          liberado: true,
          ocupado: false,
          statusVisual: deriveSlotStatus(
            { data: isoDate, horario: normalizado, liberado: true, agendamentoId: null },
            new Date(),
          ),
        },
      ]),
    );
    setNovoHorario("");
  }

  async function salvar() {
    setPending(true);
    setErroSalvar(null);

    // Ocupado sempre viaja liberado: é a única forma de o repository aceitar o
    // salvamento sem recusar por `horarioOcupadoNaoBloqueavel` — mesmo que o
    // toggle local de algum outro slot tenha mudado, esta linha nunca lê
    // `slot.liberado` para um slot ocupado.
    const inputs: AvailabilitySlotInput[] = rows.map((slot) => ({
      horario: slot.horario,
      liberado: slot.ocupado ? true : slot.liberado,
    }));

    try {
      const resultado = await saveAction(isoDate, inputs);

      if (resultado.ok) {
        setRows(sortByHorario(resultado.data ?? rows));
        setToast(feedbackTexts.disponibilidadeSalva);
      } else {
        setErroSalvar(resultado.message);
      }
    } catch {
      setErroSalvar(feedbackTexts.falhaSalvarAgenda);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {erroSalvar === null ? null : <FeedbackBanner message={erroSalvar} />}

      {rows.length === 0 ? (
        <p className="text-sm text-(--color-muted)">{feedbackTexts.dataSemHorarios}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {rows.map((slot) => (
            <li key={slot.id}>
              <label
                className={
                  "flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm " +
                  (slot.ocupado ? "opacity-80" : "cursor-pointer") +
                  " " +
                  STATUS_CLASS[slot.statusVisual]
                }
              >
                <span className="flex flex-col">
                  <span className="font-medium text-(--color-foreground)">
                    {formatTimeSafe(slot.horario)}
                  </span>
                  <span className="text-xs">{STATUS_LABEL[slot.statusVisual]}</span>
                </span>
                <input
                  type="checkbox"
                  checked={slot.liberado}
                  disabled={slot.ocupado || pending}
                  onChange={() => toggleLiberado(slot.horario)}
                  aria-label={`${agendaTexts.liberadoLabel} ${slot.horario}`}
                  className="h-5 w-5 accent-(--color-accent)"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="agenda-novo-horario"
            className="text-sm font-medium text-(--color-foreground)"
          >
            {agendaTexts.novoHorarioLabel}
          </label>
          <input
            id="agenda-novo-horario"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{2}:[0-9]{2}"
            placeholder="HH:mm"
            value={novoHorario}
            disabled={pending}
            onChange={(event) => setNovoHorario(maskTimeInput(event.target.value))}
            className={
              "min-h-11 rounded-lg border border-(--color-border) bg-(--color-surface-2) " +
              "px-3 text-sm text-(--color-foreground) " +
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
            }
          />
        </div>
        <Button type="button" variant="secondary" disabled={pending} onClick={adicionarHorario}>
          {feedbackTexts.acaoAdicionarHorario}
        </Button>
      </div>

      {erroHorario === null ? null : (
        <p role="alert" className="text-sm text-(--color-danger)">
          {erroHorario}
        </p>
      )}

      <Button type="button" pending={pending} disabled={pending} onClick={salvar}>
        {agendaTexts.salvarAcao}
      </Button>

      {toast === null ? null : <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function sortByHorario(slots: AvailabilitySlotDTO[]): AvailabilitySlotDTO[] {
  return [...slots].sort((a, b) => a.horario.localeCompare(b.horario));
}

/**
 * `09:00` → `09:00`. Um horário fora do formato canônico não pode derrubar a
 * grade inteira — o repository já descarta e registra os corrompidos
 * (`readSlots`); aqui volta ao valor cru em vez de propagar a exceção.
 */
function formatTimeSafe(horario: string): string {
  try {
    return formatTimePtBr(horario);
  } catch {
    return horario;
  }
}

function maskTimeInput(value: string): string {
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{1,2}$/.test(trimmed)) {
    return normalizeTimeOfDay(trimmed);
  }

  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
