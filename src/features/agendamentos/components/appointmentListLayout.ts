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
