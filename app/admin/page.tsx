import type { Metadata } from "next";
import { Suspense } from "react";

import {
  cancelAppointment,
  confirmAppointment,
  refreshAppointments,
} from "@/src/features/admin/actions";
import { assertAdminSession } from "@/src/features/admin/auth";
import { AdminShell } from "@/src/features/admin/components/AdminShell";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { AppointmentList } from "@/src/features/agendamentos/components/AppointmentList";
import { AppointmentListSkeleton } from "@/src/features/agendamentos/components/AppointmentListSkeleton";
import { bookingService } from "@/src/features/agendamentos/services/bookingService";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { Button } from "@/src/shared/components/Button";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";

/**
 * Dashboard administrativo de agendamentos (`design.md` §4.2).
 *
 * Server Component: a listagem é carregada no servidor e chega ao cliente como
 * DTO serializável, sem SDK do Firebase no bundle. As Server Actions viajam como
 * referência — quem autoriza cada uma é `adminAction()`, não o fato de a página
 * ter renderizado (guia local `01-app/02-guides/authentication.md`).
 *
 * A sessão é exigida aqui, antes de qualquer leitura: `AdminShell` também exige,
 * mas o shell protege a renderização, não a busca de dados feita por esta
 * página.
 *
 * O estado de Loading do `design.md` §5 é dado pelos `<Suspense>` desta página,
 * e não por um `app/admin/loading.tsx`: o arquivo de convenção é boundary do
 * SEGMENTO `/admin` — envolveria também as rotas irmãs (`/admin/login`, cujo
 * estado de carga do §5 é o oposto) e ficaria fora do `AdminShell`, apagando
 * cabeçalho e navegação durante a carga. Declarado aqui, o boundary cobre
 * exatamente a subárvore que depende da leitura.
 */

export const metadata: Metadata = {
  title: agendamentoTexts.painelTitulo,
};

/** `null` = falha recuperável de leitura; `[]` = nenhum agendamento ativo. */
type AgendamentosCarregados = AppointmentDTO[] | null;

type BoundaryProps = { agendamentos: Promise<AgendamentosCarregados> };

export default async function AdminDashboardPage() {
  await assertAdminSession();

  // Uma leitura só, compartilhada pelos dois boundaries (resumo e listagem), e
  // deliberadamente NÃO aguardada aqui: é isso que deixa o `AdminShell`
  // renderizar de imediato e restringe a espera ao que depende do dado.
  const agendamentos = carregarAgendamentos();

  return (
    <AdminShell
      title={agendamentoTexts.painelTitulo}
      actions={<RefreshAction label={feedbackTexts.acaoAtualizar} />}
      summary={
        <Suspense fallback={<StatusSummarySkeleton />}>
          <StatusSummaryBoundary agendamentos={agendamentos} />
        </Suspense>
      }
    >
      <Suspense fallback={<AppointmentListSkeleton />}>
        <AppointmentListBoundary agendamentos={agendamentos} />
      </Suspense>
    </AdminShell>
  );
}

/**
 * Lê os agendamentos ativos sem deixar a falha derrubar a rota.
 *
 * A causa já foi registrada em `withDomainErrors` (sem PII) e não pode ser
 * exibida: o painel troca a listagem pelo banner recuperável do design.
 * Nunca rejeita — os dois boundaries aguardam a MESMA promessa, e uma rejeição
 * pendurada em duas subárvores seria erro de rota, não estado de erro da tela.
 */
async function carregarAgendamentos(): Promise<AgendamentosCarregados> {
  try {
    return await bookingService.listActiveAppointments();
  } catch {
    return null;
  }
}

/** Área de conteúdo que depende da leitura — o que o `<Suspense>` cobre. */
async function AppointmentListBoundary({ agendamentos }: BoundaryProps) {
  const carregados = await agendamentos;

  if (carregados === null) {
    return (
      <FeedbackBanner
        message={feedbackTexts.falhaCarregarAgendamentos}
        action={<RefreshAction label={feedbackTexts.acaoTentarNovamente} />}
      />
    );
  }

  return (
    <AppointmentList
      agendamentos={carregados}
      confirmAction={confirmAppointment}
      cancelAction={cancelAppointment}
      emptyAction={<RefreshAction label={feedbackTexts.acaoAtualizar} />}
    />
  );
}

/** Resumo do cabeçalho — some por inteiro quando a leitura falha (§5). */
async function StatusSummaryBoundary({ agendamentos }: BoundaryProps) {
  const carregados = await agendamentos;

  return carregados === null ? null : <StatusSummary agendamentos={carregados} />;
}

/**
 * Recarrega o painel. É um `<form>`, e não um botão com `onClick`, para que
 * atualizar continue funcionando sem JavaScript no cliente.
 */
function RefreshAction({ label }: { label: string }) {
  return (
    <form action={refreshAppointments}>
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}

/** Contadores por status exibidos abaixo do título (`design.md` §4.2). */
function StatusSummary({ agendamentos }: { agendamentos: AppointmentDTO[] }) {
  const aguardando = agendamentos.filter(
    (agendamento) => agendamento.status === "aguardando_agendamento",
  ).length;
  const confirmados = agendamentos.filter(
    (agendamento) => agendamento.status === "confirmado",
  ).length;

  return (
    <dl className="flex flex-wrap gap-2 text-xs">
      {[
        { rotulo: agendamentoTexts.resumoAguardando, total: aguardando },
        { rotulo: agendamentoTexts.resumoConfirmados, total: confirmados },
      ].map((item) => (
        <div
          key={item.rotulo}
          className="flex gap-1 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-2 py-1"
        >
          <dt className="text-(--color-muted)">{item.rotulo}</dt>
          <dd className="font-medium text-(--color-foreground)">{item.total}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Reserva a altura exata das duas caixas do resumo enquanto a leitura corre.
 *
 * Sem ela, o resumo nasceria depois e empurraria a navegação para baixo — o CLS
 * no cabeçalho que a mudança do boundary existe para evitar. Decorativo: quem
 * anuncia a carga é a região `role="status"` do esqueleto da listagem (§9).
 */
function StatusSummarySkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap gap-2">
      <Skeleton className="h-[26px] w-36" />
      <Skeleton className="h-[26px] w-36" />
    </div>
  );
}
