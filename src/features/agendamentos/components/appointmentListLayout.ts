/**
 * Grid da listagem de agendamentos (`design.md` §6: 1 coluna, `md:2`, `lg:3`).
 *
 * Existe como constante para que a listagem real e o esqueleto de carga
 * reservem o MESMO número de colunas por breakpoint: o conteúdo entra no lugar
 * dos skeletons sem mudar a contagem de cards visíveis nem deslocar o layout.
 * Antes a classe era copiada literalmente entre os dois, sem nada que impedisse
 * o drift.
 *
 * Vive em módulo próprio, e não em `AppointmentList.tsx`, por causa da fronteira
 * de cliente: `AppointmentList` é `"use client"`, e todo export de um módulo
 * cliente vira uma *client reference* quando lido do servidor — a string não
 * chegaria íntegra ao `AppointmentListSkeleton`, que é renderizado no servidor
 * como fallback do `<Suspense>`. Um módulo sem diretiva é importável pelos dois
 * lados com o mesmo valor.
 */
export const APPOINTMENT_GRID_CLASS =
  "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";

/**
 * Moldura visual do card de agendamento (`design.md` §4.2/§5): raio, borda,
 * fundo e padding compartilhados entre o card real (`AppointmentCard`) e o
 * card do esqueleto de carga (`AppointmentListSkeleton`).
 *
 * Existe como constante pelo mesmo motivo de `APPOINTMENT_GRID_CLASS`: sem
 * ela, alterar raio/borda/padding do card real exige lembrar de replicar a
 * mudança no esqueleto — e nada detecta o drift quando alguém esquece.
 *
 * A altura mínima reserva o espaço do card operacional em
 * `aguardando agendamento` (dados + rodapé de ações). Cards cancelados não
 * exibem ações, mas preservam a mesma presença visual na grade.
 *
 * `h-full` e as transições (`transition-colors`, `hover:border-...`) ficam de
 * fora de propósito: são específicas do card real interativo e não fazem
 * sentido no esqueleto estático.
 */
export const APPOINTMENT_CARD_FRAME_CLASS =
  "flex min-h-48 flex-col gap-3 rounded-lg border border-(--color-border) " +
  "bg-(--color-surface-2) p-4";
