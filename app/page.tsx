import type { Metadata } from "next";
import Link from "next/link";

import { PublicAvailabilityView } from "@/src/features/agendamentos/components/PublicAvailabilityView";
import {
  listPublicAvailability,
  requestPublicAppointment,
} from "@/src/features/agendamentos/publicActions";
import { availabilityService } from "@/src/features/agenda/services/availabilityService";
import { type AvailabilitySlotDTO } from "@/src/features/agenda/types";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";
import {
  DEFAULT_APPEARANCE,
  defaultPostBookingText,
} from "@/src/features/configuracoes/types";
import { appTexts, publicTexts } from "@/src/shared/constants/texts";
import { todayIsoDate } from "@/src/shared/time";

/**
 * Entrada pública (PRD US-06, CA-07/CA-08).
 *
 * A consulta de disponibilidade e a solicitação de horário são o fluxo
 * público real da feature; o acesso administrativo continua aqui porque não
 * há outro link para `/admin/login` na aplicação.
 *
 * `force-dynamic`: a disponibilidade muda a cada solicitação aceita em
 * qualquer lugar do sistema (a própria dela — CA-08: "esse horário deixa
 * imediatamente de estar disponível"), então esta rota nunca pode servir uma
 * resposta estática/pré-renderizada. É também por isso que as Server Actions
 * públicas não chamam `revalidatePath`: sem cache de rota aqui, não há nada
 * para invalidar.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: publicTexts.tituloEntrada,
};

export default async function Home() {
  const isoDate = todayIsoDate();

  const [cores, textoPosAgendamento, slots] = await Promise.all([
    lerOuPadrao(() => settingsService.getAppearanceSettings(), DEFAULT_APPEARANCE),
    lerOuPadrao(() => settingsService.getPostBookingText(), defaultPostBookingText()),
    readInitialSlots(isoDate),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wide text-(--color-muted)">
          {appTexts.nomeProduto}
        </span>
        <h1 className="text-3xl font-semibold text-(--color-foreground)">
          {publicTexts.tituloEntrada}
        </h1>
        <p className="text-base text-(--color-muted)">{publicTexts.descricaoEntrada}</p>
      </div>

      {/*
        Cores da área do cliente aplicadas aqui (PRD US-08), nunca editáveis por
        esta rota: o administrador as configura em `/admin/configuracoes/aparencia`
        (T6) e esta seção só as lê e exibe, do mesmo jeito que `AppearancePreview`
        já faz na prévia administrativa.
      */}
      <section
        aria-label={publicTexts.tituloEntrada}
        className="rounded-lg p-4 sm:p-6"
        style={{ backgroundColor: cores.corPrimaria, color: cores.corSecundaria }}
      >
        <PublicAvailabilityView
          isoDate={isoDate}
          slots={slots}
          cores={cores}
          textoPosAgendamento={textoPosAgendamento}
          listAction={listPublicAvailability}
          requestAction={requestPublicAppointment}
        />
      </section>

      <Link
        href="/admin/login"
        className={
          "inline-flex min-h-11 w-fit items-center rounded-lg border border-(--color-border) px-4 text-sm " +
          "text-(--color-foreground) transition-colors duration-150 ease-out motion-reduce:transition-none " +
          "hover:border-(--color-border-strong) " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
        }
      >
        {publicTexts.acessoAdministrativo}
      </Link>
    </main>
  );
}

/**
 * Configuração ilegível cai no padrão do produto em vez de derrubar a vitrine.
 *
 * Mesma decisão já tomada logo abaixo para os horários, estendida às duas
 * leituras que faltavam: cores e texto pós-agendamento são apresentação, e o
 * próprio `settingsService` define que "configuração ausente não é erro" —
 * `DEFAULT_APPEARANCE`/`defaultPostBookingText()` existem exatamente para a área
 * do cliente ter cor e texto antes de o administrador salvar qualquer coisa.
 * Deixar o `unavailable` subir daqui transformava um Firestore indisponível em
 * `500` na única rota pública, escondendo inclusive a grade de horários (que tem
 * o próprio estado de erro, com "Tentar novamente"). A causa já foi registrada
 * sem PII dentro de `withDomainErrors`.
 */
async function lerOuPadrao<T>(ler: () => Promise<T>, padrao: T): Promise<T> {
  try {
    return await ler();
  } catch {
    return padrao;
  }
}

/**
 * Falha na leitura inicial cai para `null` — a view mostra o banner de erro com
 * "Tentar novamente" (mesmo padrão de `ScheduleSlotGridBoundary`, em
 * `app/admin/agenda/page.tsx`). A causa já foi registrada dentro de
 * `withDomainErrors`, sem PII; aqui resta trocar a grade pelo estado
 * recuperável.
 */
async function readInitialSlots(isoDate: string): Promise<AvailabilitySlotDTO[] | null> {
  try {
    return await availabilityService.listBookableSlots(isoDate);
  } catch {
    return null;
  }
}
