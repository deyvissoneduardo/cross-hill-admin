import "server-only";

import { settingsService } from "@/src/features/configuracoes/services/settingsService";

/**
 * Leitura do profissional único configurado, para exibição somente-leitura na
 * Agenda administrativa (PRD US-07 / CA-10).
 *
 * A fonte é o documento `configuracoes/profissional`, lido por
 * `settingsService.getConfiguredProfessional()` (T6) — a mesma leitura que a
 * reserva pública usa. A entrada é pelo **service** da feature dona, não pelo
 * repository dela: `agenda` não deve conhecer o formato do documento nem repetir
 * a política de erro de `configuracoes`. Nenhuma variável de ambiente é lida
 * aqui: quem semeia o documento na primeira leitura é o repository daquela
 * feature, em um único lugar.
 *
 * Não reaproveita `resolveProfissionalUnico` de `bookingService` (T2): aquela
 * função é privada, valida com as regras do formulário público e lança
 * `AppError("unavailable", ...)` com a mensagem do fluxo de reserva — adequada
 * para bloquear uma solicitação de cliente, não para uma tela administrativa
 * de leitura, onde "nada configurado ainda" é um estado normal (`null`), não
 * uma indisponibilidade que devesse derrubar a página. Alargar a superfície
 * pública de `bookingService` só para este reaproveitamento também criaria
 * acoplamento que a feature `agenda` não precisa.
 */

/**
 * Nome do profissional único configurado, ou `null` quando ausente/vazio.
 *
 * Falha de leitura da configuração também vira `null`: este bloco é informativo
 * e não pode derrubar a Agenda inteira por causa dele. O motivo fica no log do
 * servidor, sem conteúdo da configuração.
 */
export async function readConfiguredProfessionalName(): Promise<string | null> {
  try {
    return await settingsService.getConfiguredProfessional();
  } catch (error) {
    console.warn("[agenda] profissional não pôde ser lido", {
      tipo: error instanceof Error ? error.name : typeof error,
    });

    return null;
  }
}
