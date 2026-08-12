import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";

import { saveAvailability } from "@/src/features/admin/actions";
import { assertAdminSession } from "@/src/features/admin/auth";
import { AdminShell } from "@/src/features/admin/components/AdminShell";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { ScheduleSlotGrid } from "@/src/features/agenda/components/ScheduleSlotGrid";
import { SingleProfessionalSummary } from "@/src/features/agenda/components/SingleProfessionalSummary";
import { availabilityService } from "@/src/features/agenda/services/availabilityService";
import { readConfiguredProfessionalName } from "@/src/features/agenda/services/professionalSummary";
import { type AvailabilitySlotDTO } from "@/src/features/agenda/types";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { agendaTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { isIsoDate, todayIsoDate } from "@/src/shared/time";

/**
 * Agenda e Disponibilidade (`design.md` §4.3): controle manual de datas e
 * horários, com o profissional único exibido somente-leitura ao lado.
 *
 * Server Component, mesmo padrão de guarda de `app/admin/page.tsx`:
 * `assertAdminSession()` roda ANTES de qualquer leitura. A data selecionada
 * navega por `?data=YYYY-MM-DD` (tech_spec §7: query param compartilhável) via
 * `next/form` — GET com navegação client-side, sem duplicar a lógica de
 * fetch/loading que um `<a>`/reload completo exigiria.
 *
 * Só a leitura dos slots do dia (`availabilityService.listDaySlots`, a
 * chamada ao Firestore) fica dentro do `<Suspense>` — a data/resumo do
 * profissional não dependem dela e não podem esperar por ela (`design.md`
 * §4.3: "no mobile, seletor de data no topo, resumo do profissional único...
 * e lista de slots").
 */

export const metadata: Metadata = {
  title: agendaTexts.tituloPagina,
};

type AgendaPageProps = PageProps<"/admin/agenda">;

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  await assertAdminSession();

  const params = await searchParams;
  const isoDate = resolveSelectedDate(params.data);

  return (
    <AdminShell title={agendaTexts.tituloPagina}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-4 md:w-72 md:shrink-0">
          <DateSelectorForm isoDate={isoDate} />
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <ProfessionalSummaryBoundary />
          </Suspense>
        </div>

        <div className="flex-1">
          <Suspense fallback={<GridSkeleton />}>
            <ScheduleSlotGridBoundary isoDate={isoDate} />
          </Suspense>
        </div>
      </div>
    </AdminShell>
  );
}

/** `?data=` inválido ou ausente cai no dia de hoje da operação (`-03:00`). */
function resolveSelectedDate(data: string | string[] | undefined): string {
  return typeof data === "string" && isIsoDate(data) ? data : todayIsoDate();
}

/** Formulário de navegação por data — GET puro, funciona sem JavaScript. */
function DateSelectorForm({ isoDate }: { isoDate: string }) {
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
      />
      <Button type="submit" variant="secondary">
        {agendaTexts.seletorDataAcao}
      </Button>
    </Form>
  );
}

/**
 * Bloco somente-leitura do profissional único (PRD US-07/CA-10).
 *
 * Tem `<Suspense>` próprio porque a leitura agora vai ao Firestore
 * (`configuracoes/profissional`, T6) e não depende dos slots: o seletor de data
 * continua aparecendo imediatamente, e cada leitura preenche a sua parte da
 * tela quando chega (`design.md` §4.3).
 */
async function ProfessionalSummaryBoundary() {
  return (
    <SingleProfessionalSummary professional={await readConfiguredProfessionalName()} />
  );
}

/** Área que depende da leitura dos slots — o que o `<Suspense>` cobre. */
async function ScheduleSlotGridBoundary({ isoDate }: { isoDate: string }) {
  let slots: AvailabilitySlotDTO[] | null;
  try {
    slots = await availabilityService.listDaySlots(isoDate);
  } catch {
    // A causa já foi registrada em `withDomainErrors` (sem PII); aqui resta
    // trocar a grade pelo banner recuperável do design.
    slots = null;
  }

  if (slots === null) {
    return (
      <FeedbackBanner
        message={feedbackTexts.falhaCarregarAgenda}
        action={<RetryForm isoDate={isoDate} />}
      />
    );
  }

  // `key={isoDate}` remonta o componente ao trocar de data: o estado local de
  // edição (toggles, horário em digitação) de uma data não pode sobreviver
  // para a próxima.
  return (
    <ScheduleSlotGrid
      key={isoDate}
      isoDate={isoDate}
      slots={slots}
      saveAction={saveAvailability}
    />
  );
}

/** "Tentar novamente" do banner de erro — resubmete a MESMA data. */
function RetryForm({ isoDate }: { isoDate: string }) {
  return (
    <Form action="/admin/agenda">
      <input type="hidden" name="data" value={isoDate} />
      <Button type="submit" variant="secondary">
        {feedbackTexts.acaoTentarNovamente}
      </Button>
    </Form>
  );
}

/** Skeleton de calendário/data e 8 slots (`design.md` §5). */
function GridSkeleton() {
  return (
    <div
      role="status"
      aria-label={agendaTexts.carregandoAgenda}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}
