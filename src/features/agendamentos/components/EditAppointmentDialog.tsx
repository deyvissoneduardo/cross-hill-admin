"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import {
  type AvailabilityActionFn,
  type RescheduleAppointmentActionFn,
} from "@/src/features/agendamentos/components/AppointmentCard";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";

type EditAppointmentDialogProps = {
  open: boolean;
  agendamento: AppointmentDTO;
  listAvailableAction: AvailabilityActionFn;
  rescheduleAction: RescheduleAppointmentActionFn;
  onSuccess: (agendamento: AppointmentDTO) => void;
  onCancel: () => void;
};

export function EditAppointmentDialog({
  open,
  agendamento,
  listAvailableAction,
  rescheduleAction,
  onSuccess,
  onCancel,
}: EditAppointmentDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const [data, setData] = useState(agendamento.data);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horario, setHorario] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || data.length === 0) return;

    const currentRequest = ++requestId.current;
    void listAvailableAction(data)
      .then((resultado) => {
        if (requestId.current !== currentRequest) return;
        if (!resultado.ok) {
          setErro(resultado.message);
          return;
        }
        setHorarios((resultado.data ?? []).map((slot) => slot.horario));
      })
      .catch(() => {
        if (requestId.current === currentRequest) {
          setErro(feedbackTexts.falhaCarregarHorarios);
        }
      })
      .finally(() => {
        if (requestId.current === currentRequest) setCarregando(false);
      });
  }, [data, listAvailableAction, open]);

  if (!open) return null;

  function selecionarData(novaData: string) {
    setData(novaData);
    setCarregando(true);
    setHorarios([]);
    setHorario("");
    setErro(null);
  }

  async function salvar() {
    if (salvando || horario.length === 0) return;
    setSalvando(true);
    setErro(null);

    try {
      const resultado = await rescheduleAction(agendamento.id, data, horario);
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      onSuccess(resultado.data ?? { ...agendamento, data, horario });
    } catch {
      setErro(feedbackTexts.falhaEditarAgendamento);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-2) p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold text-(--color-foreground)">
          {agendamentoTexts.editarDialogTitulo}
        </h2>

        <Field
          id={`editar-data-${agendamento.id}`}
          type="date"
          label={agendamentoTexts.editarDataLabel}
          value={data}
          disabled={salvando}
          onChange={(event) => selecionarData(event.currentTarget.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`editar-horario-${agendamento.id}`}
            className="text-sm font-medium text-(--color-foreground)"
          >
            {agendamentoTexts.editarHorarioLabel}
          </label>
          <select
            id={`editar-horario-${agendamento.id}`}
            value={horario}
            disabled={carregando || salvando || horarios.length === 0}
            onChange={(event) => setHorario(event.currentTarget.value)}
            className="min-h-11 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 text-sm text-(--color-foreground) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) disabled:opacity-60"
          >
            <option value="">
              {carregando
                ? agendamentoTexts.editarCarregandoHorarios
                : horarios.length === 0
                  ? agendamentoTexts.editarSemHorarios
                  : agendamentoTexts.editarHorarioLabel}
            </option>
            {horarios.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {erro === null ? null : <FeedbackBanner message={erro} />}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={salvando} onClick={onCancel}>
            {agendamentoTexts.dialogVoltar}
          </Button>
          <Button
            pending={salvando}
            pendingLabel={agendamentoTexts.cardAtualizando}
            disabled={horario.length === 0 || carregando}
            onClick={salvar}
          >
            {agendamentoTexts.editarSalvarAcao}
          </Button>
        </div>
      </div>
    </div>
  );
}
