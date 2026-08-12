"use client";

import { useState } from "react";

import { type AvailabilitySlotDTO } from "@/src/features/agenda/types";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import {
  type AppearanceSettingsDTO,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { feedbackTexts, publicTexts } from "@/src/shared/constants/texts";
import { type ActionResult, type FieldErrors } from "@/src/shared/errors";
import { formatDateTimePtBr } from "@/src/shared/time";

/** Server Action pública de solicitação, vista pela UI (PRD CA-07/CA-08/CA-09). */
export type RequestPublicAppointmentAction = (input: {
  cliente: string;
  telefone: string;
  data: string;
  horario: string;
}) => Promise<ActionResult<AppointmentDTO>>;

type PublicBookingFormProps = {
  /** Horário escolhido na grade — `data`/`horario` viajam exatamente como estão aqui. */
  slot: AvailabilitySlotDTO;
  /** Cores da área do cliente já validadas (T6) — nunca editáveis por aqui. */
  cores: AppearanceSettingsDTO;
  /** Conteúdo exibido ao cliente após a solicitação aceita (PRD US-09). */
  textoPosAgendamento: PostBookingTextDTO;
  requestAction: RequestPublicAppointmentAction;
  /** Volta para a grade de horários — ao cancelar ou depois de concluir. */
  onCancel: () => void;
};

/**
 * Formulário público de solicitação (PRD US-06, CA-07/CA-08/CA-09).
 *
 * Sem `profissional` no payload, de propósito: a v1 tem profissional único
 * resolvido por `bookingService` a partir da configuração (RN-10/RN-11) — o
 * cliente nunca escolhe nem envia esse campo, e este formulário não tem campo
 * para ele.
 *
 * `data`/`horario` vêm do slot já selecionado na grade (que só lista horários
 * liberados e livres, CA-07), não de um campo editável: o cliente escolhe
 * ENTRE os horários oferecidos, nunca digita um horário livremente. Um slot que
 * deixou de existir enquanto este formulário estava aberto (outra pessoa
 * solicitou primeiro, CA-09) é recusado pela mesma transação do repository —
 * a mensagem "Horário indisponível." chega pronta em `resultado.message`.
 *
 * Reutiliza `Field`/`Button` (T1) com os tokens fixos do produto: o contraste
 * dos dois é garantido pelo design (`app/globals.css`), diferente de
 * `cores.corPrimaria`/`corSecundaria`/`corDestaque`, que só são verificadas
 * entre si (`colorValidator`, T6) — nunca contra um token fixo como
 * `--color-danger`. É por isso que a mensagem de erro abaixo usa peso, não cor,
 * para se destacar (`design.md` §9: "Badges... devem combinar cor e texto, não
 * depender só de cor").
 */
export function PublicBookingForm({
  slot,
  cores,
  textoPosAgendamento,
  requestAction,
  onCancel,
}: PublicBookingFormProps) {
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<AppointmentDTO | null>(null);

  async function solicitar() {
    setPending(true);
    setErro(null);
    setFieldErrors({});

    try {
      const resultado = await requestAction({
        cliente,
        telefone,
        data: slot.data,
        horario: slot.horario,
      });

      if (resultado.ok) {
        setConfirmado(resultado.data ?? null);
      } else {
        setFieldErrors(resultado.fieldErrors ?? {});
        setErro(resultado.message);
      }
    } catch {
      setErro(feedbackTexts.falhaSolicitarAgendamento);
    } finally {
      setPending(false);
    }
  }

  if (confirmado) {
    return (
      <section
        role="status"
        aria-labelledby="publico-confirmacao-titulo"
        className="flex flex-col gap-3 rounded-lg border border-current/30 p-4"
      >
        <h2 id="publico-confirmacao-titulo" className="text-lg font-semibold">
          {textoPosAgendamento.titulo}
        </h2>
        {/* Texto configurado pelo administrador — exibido como texto puro, nunca como HTML. */}
        <p className="text-sm whitespace-pre-line">{textoPosAgendamento.descricao}</p>

        {textoPosAgendamento.dicas.length === 0 ? null : (
          <ul className="list-disc pl-5 text-sm">
            {textoPosAgendamento.dicas.map((dica, indice) => (
              <li key={indice}>{dica}</li>
            ))}
          </ul>
        )}

        {textoPosAgendamento.avisos.length === 0 ? null : (
          <ul className="list-disc pl-5 text-sm">
            {textoPosAgendamento.avisos.map((aviso, indice) => (
              <li key={indice}>{aviso}</li>
            ))}
          </ul>
        )}

        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
          {publicTexts.escolherOutroHorario}
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-current/30 p-4">
      <p className="text-sm font-medium">
        {publicTexts.horarioSelecionadoRotulo}: {formatDateTimePtBr(slot.data, slot.horario)}
      </p>

      <Field
        id="publico-cliente"
        label={publicTexts.clienteLabel}
        value={cliente}
        disabled={pending}
        error={fieldErrors.cliente}
        onChange={(event) => setCliente(event.target.value)}
      />

      <Field
        id="publico-telefone"
        type="tel"
        label={publicTexts.telefoneLabel}
        value={telefone}
        disabled={pending}
        error={fieldErrors.telefone}
        onChange={(event) => setTelefone(event.target.value)}
      />

      {erro === null ? null : (
        <p role="alert" className="text-sm font-semibold">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          pending={pending}
          pendingLabel={publicTexts.solicitandoAcao}
          disabled={pending}
          onClick={solicitar}
          style={{ backgroundColor: cores.corDestaque, color: cores.corPrimaria }}
        >
          {publicTexts.solicitarAcao}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
          {publicTexts.escolherOutroHorario}
        </Button>
      </div>
    </div>
  );
}
