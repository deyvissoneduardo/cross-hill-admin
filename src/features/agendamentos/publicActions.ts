"use server";

import { availabilityService } from "@/src/features/agenda/services/availabilityService";
import { type AvailabilitySlotDTO } from "@/src/features/agenda/types";
import {
  bookingService,
  type AppointmentRequestInput,
} from "@/src/features/agendamentos/services/bookingService";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { feedbackTexts } from "@/src/shared/constants/texts";
import { actionOk, toActionResult, type ActionResult } from "@/src/shared/errors";

/**
 * Server Actions públicas: a única entrada não autenticada da aplicação
 * (PRD US-06, CA-07/CA-08/CA-09).
 *
 * Contrato da camada, análogo ao de `admin/actions.ts` — com uma diferença
 * central: **não existe guarda de sessão aqui**, porque não existe sessão para
 * guardar. É por isso que este módulo vive em arquivo separado de
 * `admin/actions.ts`: quem importa só este arquivo nunca alcança
 * `adminAction`/`assertAdminSession`, então a superfície administrativa não é
 * acessível a partir da vitrine pública nem por engano de import.
 *
 * - **Superfície mínima**: só consultar disponibilidade e solicitar
 *   agendamento. Nenhuma outra operação de domínio (confirmar, cancelar,
 *   salvar configuração) é exposta por aqui.
 * - **Toda entrada é `unknown` de fato**, mesmo com o tipo declarado: como
 *   qualquer Server Action, esta é alcançável por `POST` direto (guia local
 *   `01-app/02-guides/server-actions.md`), e a validação real é a de
 *   `bookingService`/`appointmentValidators` — esta camada só traduz o erro.
 * - **Sem `revalidatePath`**: `app/page.tsx` é `force-dynamic` e lê o Firestore
 *   a cada request (nenhuma leitura aqui passa por `fetch()`/Data Cache), então
 *   não há cache de rota para invalidar depois da solicitação.
 * - **Sem rate limit**: mesma pendência já registrada em
 *   `bookingService.requestAppointmentAtomically` — a transação do Firestore
 *   impede overbooking, mas nada aqui limita quantas solicitações um mesmo
 *   requisitante pode disparar.
 */

/** Disponibilidade pública da data — só slots liberados, livres e futuros. */
export async function listPublicAvailability(
  isoDate: string,
): Promise<ActionResult<AvailabilitySlotDTO[]>> {
  try {
    const slots = await availabilityService.listBookableSlots(isoDate);
    return actionOk(slots);
  } catch (error) {
    return toActionResult(
      error,
      feedbackTexts.falhaCarregarDisponibilidadePublica,
      "publico/disponibilidade",
    );
  }
}

/**
 * Solicita o agendamento, ocupando o horário atomicamente (PRD CA-08/CA-09).
 *
 * Slot bloqueado, ocupado ou já solicitado por outra pessoa nesse instante
 * falha com `conflict` ("Horário indisponível.") — a mensagem já pronta para a
 * UI, sem gravar nada (`bookingService.requestAppointmentAtomically`, T2).
 */
export async function requestPublicAppointment(
  input: AppointmentRequestInput,
): Promise<ActionResult<AppointmentDTO>> {
  try {
    const agendamento = await bookingService.requestAppointmentAtomically(input);
    return actionOk(agendamento);
  } catch (error) {
    return toActionResult(
      error,
      feedbackTexts.falhaSolicitarAgendamento,
      "publico/reserva",
    );
  }
}
