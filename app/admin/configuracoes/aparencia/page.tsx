import type { Metadata } from "next";
import { Suspense } from "react";

import { saveAppearanceSettings } from "@/src/features/admin/actions";
import { assertAdminSession } from "@/src/features/admin/auth";
import { AdminShell } from "@/src/features/admin/components/AdminShell";
import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { AppearanceSettingsForm } from "@/src/features/configuracoes/components/AppearanceSettingsForm";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";
import { type AppearanceSettingsDTO } from "@/src/features/configuracoes/types";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { configuracoesTexts } from "@/src/shared/constants/texts";

/**
 * Configurações de Aparência (`design.md` §4.4, PRD US-08).
 *
 * Server Component com a mesma guarda das demais telas administrativas:
 * `assertAdminSession()` roda ANTES de qualquer leitura — o shell protege a
 * renderização, não a busca de dados (guia local
 * `01-app/02-guides/authentication.md`).
 *
 * Só a leitura das cores (ida ao Firestore) fica dentro do `<Suspense>`: o
 * cabeçalho e a navegação não dependem dela e não podem esperar por ela.
 */

export const metadata: Metadata = {
  title: configuracoesTexts.aparenciaTitulo,
};

export default async function AparenciaPage() {
  await assertAdminSession();

  return (
    <AdminShell title={configuracoesTexts.aparenciaTitulo}>
      <p className="mb-4 text-sm text-(--color-muted)">
        {configuracoesTexts.aparenciaDescricao}
      </p>

      <Suspense fallback={<FormSkeleton />}>
        <AppearanceBoundary />
      </Suspense>
    </AdminShell>
  );
}

/** Área que depende da leitura da configuração — o que o `<Suspense>` cobre. */
async function AppearanceBoundary() {
  let cores: AppearanceSettingsDTO | null;
  try {
    cores = await settingsService.getAppearanceSettings();
  } catch {
    // A causa já foi registrada em `withDomainErrors` (sem dado sensível); aqui
    // resta o banner recuperável do design.
    cores = null;
  }

  if (cores === null) {
    // Sem formulário de propósito: editar sobre uma leitura que falhou salvaria
    // por cima de uma configuração que ninguém chegou a ver.
    return <FeedbackBanner message={configuracoesTexts.falhaCarregarConfiguracoes} />;
  }

  return <AppearanceSettingsForm cores={cores} saveAction={saveAppearanceSettings} />;
}

/** Skeleton de campos e prévia em bloco neutro (`design.md` §5). */
function FormSkeleton() {
  return (
    <div
      role="status"
      aria-label={configuracoesTexts.carregandoConfiguracoes}
      className="flex flex-col gap-6 md:flex-row md:items-start"
    >
      <div className="flex w-full flex-col gap-4 md:max-w-sm">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full md:flex-1" />
    </div>
  );
}
