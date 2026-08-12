import type { Metadata } from "next";
import { Suspense } from "react";

import { savePostBookingText } from "@/src/features/admin/actions";
import { assertAdminSession } from "@/src/features/admin/auth";
import { AdminShell } from "@/src/features/admin/components/AdminShell";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { PostBookingTextForm } from "@/src/features/configuracoes/components/PostBookingTextForm";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";
import { type PostBookingTextDTO } from "@/src/features/configuracoes/types";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { configuracoesTexts } from "@/src/shared/constants/texts";

/**
 * Configurações de Pós-Agendamento (`design.md` §4.5, PRD US-09).
 *
 * Mesma guarda e mesmo recorte de `Suspense` da tela de aparência:
 * `assertAdminSession()` antes de qualquer leitura, e só a ida ao Firestore
 * fica sob o skeleton.
 *
 * Quando não há textos salvos, o service devolve o texto mínimo padrão — a
 * prévia nasce preenchida (`design.md` §5), sem estado vazio nesta tela.
 */

export const metadata: Metadata = {
  title: configuracoesTexts.posAgendamentoTitulo,
};

export default async function PosAgendamentoPage() {
  await assertAdminSession();

  return (
    <AdminShell title={configuracoesTexts.posAgendamentoTitulo}>
      <p className="mb-4 text-sm text-(--color-muted)">
        {configuracoesTexts.posAgendamentoDescricao}
      </p>

      <Suspense fallback={<FormSkeleton />}>
        <PostBookingTextBoundary />
      </Suspense>
    </AdminShell>
  );
}

/** Área que depende da leitura da configuração — o que o `<Suspense>` cobre. */
async function PostBookingTextBoundary() {
  let textos: PostBookingTextDTO | null;
  try {
    textos = await settingsService.getPostBookingText();
  } catch {
    // A causa já foi registrada em `withDomainErrors` (sem dado sensível); aqui
    // resta o banner recuperável do design.
    textos = null;
  }

  if (textos === null) {
    // Sem formulário de propósito: salvar sobre uma leitura que falhou
    // sobrescreveria textos que ninguém chegou a ver.
    return <FeedbackBanner message={configuracoesTexts.falhaCarregarConfiguracoes} />;
  }

  return <PostBookingTextForm textos={textos} saveAction={savePostBookingText} />;
}

/** Skeleton de campos e prévia textual (`design.md` §5). */
function FormSkeleton() {
  return (
    <div
      role="status"
      aria-label={configuracoesTexts.carregandoConfiguracoes}
      className="flex flex-col gap-6 md:flex-row md:items-start"
    >
      <div className="flex w-full flex-col gap-4 md:max-w-xl">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-40 w-full md:flex-1" />
    </div>
  );
}
