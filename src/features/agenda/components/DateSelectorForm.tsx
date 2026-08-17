"use client";

import Form from "next/form";
import { type ChangeEvent } from "react";

import { Field } from "@/src/shared/components/Field";
import { agendaTexts } from "@/src/shared/constants/texts";

type DateSelectorFormProps = {
  isoDate: string;
};

/** Navega para a agenda da nova data assim que o calendário muda. */
export function DateSelectorForm({ isoDate }: DateSelectorFormProps) {
  function submitSelectedDate(event: ChangeEvent<HTMLInputElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <Form
      action="/admin/agenda"
      className="flex flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-2) p-4"
    >
      <Field
        id="agenda-data"
        name="data"
        type="date"
        label={agendaTexts.seletorDataLabel}
        defaultValue={isoDate}
        onChange={submitSelectedDate}
      />
    </Form>
  );
}
