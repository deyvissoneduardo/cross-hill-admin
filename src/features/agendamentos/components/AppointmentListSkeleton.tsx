import { APPOINTMENT_GRID_CLASS } from "@/src/features/agendamentos/components/appointmentListLayout";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { agendamentoTexts } from "@/src/shared/constants/texts";

/**
 * Estado de Loading do dashboard (`design.md` §5): "Skeleton de 3 cards com
 * linhas para status, horário, cliente e ações".
 *
 * É o fallback do `<Suspense>` declarado DENTRO de `app/admin/page.tsx` — não um
 * `loading.tsx` de segmento. O boundary de segmento envolveria também as rotas
 * irmãs de `/admin` (hoje `/admin/login`, cujo estado de carga do §5 é o oposto:
 * "campos permanecem visíveis; não usar tela cheia") e ficaria fora do
 * `AdminShell`, apagando cabeçalho e navegação durante a carga. Aqui o esqueleto
 * ocupa somente a área de conteúdo do shell, que é o que depende da leitura.
 *
 * Sem largura ou respiro próprios de propósito: já está dentro do `<main>` do
 * `AdminShell`. O grid vem da constante compartilhada com `AppointmentList`.
 */

const CARDS_ESQUELETO = ["a", "b", "c"] as const;

export function AppointmentListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={agendamentoTexts.painelCarregando}
      className={APPOINTMENT_GRID_CLASS}
    >
      {CARDS_ESQUELETO.map((chave) => (
        <div
          key={chave}
          data-testid="skeleton-card"
          className={
            "flex flex-col gap-3 rounded-lg border border-(--color-border) " +
            "bg-(--color-surface-2) p-4"
          }
        >
          <div className="flex items-start justify-between gap-3">
            {/* status */}
            <Skeleton className="h-7 w-40" />
            {/* horário */}
            <Skeleton className="h-6 w-24" />
          </div>

          {/* cliente + telefone + profissional */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>

          {/* ações */}
          <div className="mt-auto flex gap-2 pt-1">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
