"use client";

import { useState } from "react";

import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { type AvailabilitySlotDTO } from "@/src/features/agenda/types";
import {
  PublicBookingForm,
  type RequestPublicAppointmentAction,
} from "@/src/features/agendamentos/components/PublicBookingForm";
import {
  type AppearanceSettingsDTO,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { feedbackTexts, publicTexts } from "@/src/shared/constants/texts";
import { type ActionResult } from "@/src/shared/errors";
import { formatTimePtBr, isIsoDate } from "@/src/shared/time";

/** Server Action pública de consulta de disponibilidade, vista pela UI. */
export type ListPublicAvailabilityAction = (
  isoDate: string,
) => Promise<ActionResult<AvailabilitySlotDTO[]>>;

type PublicAvailabilityViewProps = {
  isoDate: string;
  /** Slots já filtrados como solicitáveis (`isSlotDTOBookable`, T2), ou `null` se a leitura inicial falhou. */
  slots: AvailabilitySlotDTO[] | null;
  cores: AppearanceSettingsDTO;
  textoPosAgendamento: PostBookingTextDTO;
  listAction: ListPublicAvailabilityAction;
  requestAction: RequestPublicAppointmentAction;
};

/**
 * Vitrine pública de horários (PRD US-06, CA-07/CA-08).
 *
 * Cada troca de data busca a disponibilidade de novo pela Server Action
 * (`listAction`): o cliente não fala com o Firestore nem com o service
 * diretamente, e a mesma filtragem de `isSlotDTOBookable` (T2) roda a cada
 * consulta — nunca um recorte feito aqui, no navegador.
 *
 * Selecionar um horário troca a grade pelo `PublicBookingForm`. Voltar da
 * seleção (cancelar ou concluir a solicitação) busca a disponibilidade de novo
 * — o horário pode ter deixado de existir enquanto o formulário estava aberto,
 * porque outra pessoa solicitou primeiro (PRD CA-09), e a grade nunca deve
 * continuar oferecendo um horário que já não é mais solicitável.
 */
export function PublicAvailabilityView({
  isoDate: isoDateInicial,
  slots: slotsIniciais,
  cores,
  textoPosAgendamento,
  listAction,
  requestAction,
}: PublicAvailabilityViewProps) {
  const [isoDate, setIsoDate] = useState(isoDateInicial);
  const [slots, setSlots] = useState<AvailabilitySlotDTO[] | null>(slotsIniciais);
  const [falhaCarregar, setFalhaCarregar] = useState(slotsIniciais === null);
  const [pending, setPending] = useState(false);
  const [selecionado, setSelecionado] = useState<AvailabilitySlotDTO | null>(null);

  async function carregar(data: string) {
    setPending(true);

    try {
      const resultado = await listAction(data);

      if (resultado.ok) {
        setSlots(resultado.data ?? []);
        setFalhaCarregar(false);
      } else {
        setSlots(null);
        setFalhaCarregar(true);
      }
    } catch {
      setSlots(null);
      setFalhaCarregar(true);
    } finally {
      setPending(false);
    }
  }

  function selecionarData(valor: string) {
    if (!isIsoDate(valor)) return;

    setIsoDate(valor);
    setSelecionado(null);
    void carregar(valor);
  }

  function voltarParaGrade() {
    setSelecionado(null);
    void carregar(isoDate);
  }

  if (selecionado) {
    return (
      <PublicBookingForm
        slot={selecionado}
        cores={cores}
        textoPosAgendamento={textoPosAgendamento}
        requestAction={requestAction}
        onCancel={voltarParaGrade}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        id="publico-data"
        type="date"
        label={publicTexts.dataLabel}
        value={isoDate}
        min={isoDateInicial}
        disabled={pending}
        onChange={(event) => selecionarData(event.target.value)}
      />

      <div>
        <h2 className="text-sm font-medium">{publicTexts.horariosDisponiveisTitulo}</h2>

        {pending ? (
          <div
            role="status"
            aria-label={publicTexts.carregandoDisponibilidade}
            className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
          >
            {Array.from({ length: 6 }, (_, indice) => (
              <Skeleton key={indice} className="h-11 w-full" />
            ))}
          </div>
        ) : falhaCarregar ? (
          <div className="mt-3">
            <FeedbackBanner
              message={feedbackTexts.falhaCarregarDisponibilidadePublica}
              action={
                <Button type="button" variant="secondary" onClick={() => carregar(isoDate)}>
                  {feedbackTexts.acaoTentarNovamente}
                </Button>
              }
            />
          </div>
        ) : slots === null || slots.length === 0 ? (
          <p className="mt-3 text-sm">{feedbackTexts.dataSemHorarios}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <li key={slot.id}>
                <button
                  type="button"
                  onClick={() => setSelecionado(slot)}
                  style={{ borderColor: cores.corDestaque, color: cores.corDestaque }}
                  className={
                    "min-h-11 w-full rounded-lg border px-2 text-sm font-medium " +
                    "transition-colors duration-150 ease-out motion-reduce:transition-none " +
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                  }
                >
                  {formatTimePtBr(slot.horario)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
