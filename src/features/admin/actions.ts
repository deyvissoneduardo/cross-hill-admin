"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/src/features/admin/auth";
import { bookingService } from "@/src/features/agendamentos/services/bookingService";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { availabilityService } from "@/src/features/agenda/services/availabilityService";
import {
  type AvailabilitySlotDTO,
  type AvailabilitySlotInput,
} from "@/src/features/agenda/types";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";
import {
  type AppearanceSettingsDTO,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import { type AppearanceSettingsInput } from "@/src/features/configuracoes/validators/colorValidator";
import { type PostBookingTextInput } from "@/src/features/configuracoes/validators/textSettingsValidator";
import { feedbackTexts } from "@/src/shared/constants/texts";
import { actionOk, toActionResult, type ActionResult } from "@/src/shared/errors";

/**
 * Server Actions administrativas do painel de agendamentos.
 *
 * Contrato da camada:
 *
 * - **Toda action nasce de `adminAction()`.** Uma Server Action é alcançável por
 *   `POST` direto em qualquer rota (o guia local `01-app/02-guides/server-actions.md`
 *   é explícito: "treat every action as an untrusted entry point"), então a
 *   guarda precisa ser estrutural, não uma primeira linha que alguém esquece.
 * - **O erro nunca atravessa como exceção.** O retorno é sempre `ActionResult`
 *   serializável, com mensagem pt-BR já pronta para a UI; detalhe de SDK e stack
 *   ficam no log do servidor (`withDomainErrors`/`toActionResult`).
 * - **Revalidação só depois do sucesso.** `revalidatePath` re-renderiza a rota na
 *   MESMA resposta da ação, então o painel já volta sem o agendamento cancelado —
 *   revalidar após uma falha só descartaria cache à toa.
 * - **A regra de negócio não mora aqui.** Confirmar/cancelar é do
 *   `bookingService`; esta camada autentica, traduz o erro e revalida.
 */

const DASHBOARD_PATH = "/admin";
const AGENDA_PATH = "/admin/agenda";
const APARENCIA_PATH = "/admin/configuracoes/aparencia";
const POS_AGENDAMENTO_PATH = "/admin/configuracoes/agendamento";

/**
 * Registra a confirmação administrativa do agendamento (PRD CA-03/CA-04).
 *
 * Confirmação duplicada volta como `conflict` com "Este agendamento já foi
 * confirmado." — a UI trata como aviso, não como falha a repetir.
 */
export const confirmAppointment = adminAction(
  async (
    _session,
    agendamentoId: string,
  ): Promise<ActionResult<AppointmentDTO>> => {
    try {
      const agendamento = await bookingService.confirmAdminAppointment(agendamentoId);
      revalidatePath(DASHBOARD_PATH);

      return actionOk(agendamento);
    } catch (error) {
      return toActionResult(error, feedbackTexts.falhaConfirmar, "admin/confirmacao");
    }
  },
);

/**
 * Cancela o agendamento, liberando o horário (PRD CA-05).
 *
 * A saída da listagem ativa vem da revalidação: o service grava o cancelamento e
 * a consulta do dashboard já não devolve cancelados.
 */
export const cancelAppointment = adminAction(
  async (
    _session,
    agendamentoId: string,
  ): Promise<ActionResult<AppointmentDTO>> => {
    try {
      const agendamento = await bookingService.cancelAppointment(agendamentoId);
      revalidatePath(DASHBOARD_PATH);

      return actionOk(agendamento);
    } catch (error) {
      return toActionResult(error, feedbackTexts.falhaCancelar, "admin/cancelamento");
    }
  },
);

/**
 * Salva a agenda manual da data com os horários liberados/bloqueados
 * informados (PRD US-05).
 *
 * A regra de que um horário ocupado não pode virar livre/bloqueado mora
 * inteiramente em `availabilityService`/`availabilityRepository` (T2) — esta
 * camada só autentica, traduz o erro (`conflict` quando o payload tenta
 * bloquear um horário ocupado) e revalida a rota no sucesso.
 */
export const saveAvailability = adminAction(
  async (
    _session,
    isoDate: string,
    slots: readonly AvailabilitySlotInput[],
  ): Promise<ActionResult<AvailabilitySlotDTO[]>> => {
    try {
      const atualizados = await availabilityService.saveDayAvailability(isoDate, slots);
      revalidatePath(AGENDA_PATH);

      return actionOk(atualizados);
    } catch (error) {
      return toActionResult(error, feedbackTexts.falhaSalvarAgenda, "admin/agenda");
    }
  },
);

/**
 * Salva as cores da área do cliente (PRD CA-11/CA-12).
 *
 * O payload chega da rede, não do formulário: a validação de formato e de
 * contraste é inteiramente do `settingsService`/`colorValidator`, que recusa o
 * par ilegível com `validation` + `fieldErrors` antes de qualquer escrita — a
 * checagem inline do formulário é conveniência, não a barreira.
 */
export const saveAppearanceSettings = adminAction(
  async (
    _session,
    cores: AppearanceSettingsInput,
  ): Promise<ActionResult<AppearanceSettingsDTO>> => {
    try {
      const salvas = await settingsService.saveAppearanceSettings(cores);
      revalidatePath(APARENCIA_PATH);

      return actionOk(salvas);
    } catch (error) {
      return toActionResult(
        error,
        feedbackTexts.falhaSalvarConfiguracoes,
        "admin/aparencia",
      );
    }
  },
);

/**
 * Salva os textos exibidos ao cliente após a solicitação (PRD CA-13).
 *
 * Conteúdo recusado volta como `validation` com o campo destacado e a
 * configuração vigente intacta — o service valida antes de escrever.
 */
export const savePostBookingText = adminAction(
  async (
    _session,
    textos: PostBookingTextInput,
  ): Promise<ActionResult<PostBookingTextDTO>> => {
    try {
      const salvos = await settingsService.savePostBookingText(textos);
      revalidatePath(POS_AGENDAMENTO_PATH);

      return actionOk(salvos);
    } catch (error) {
      return toActionResult(
        error,
        feedbackTexts.falhaSalvarConfiguracoes,
        "admin/pos-agendamento",
      );
    }
  },
);

/**
 * Recarrega o painel.
 *
 * É a ação "Atualizar" do cabeçalho e a recuperação de "Tentar novamente" do
 * banner de erro (`design.md` §5/§5.1). Não muda estado algum — apenas invalida
 * a rota — e por isso é submetida por `<form>`, funcionando sem JavaScript.
 */
export const refreshAppointments = adminAction(async (): Promise<void> => {
  revalidatePath(DASHBOARD_PATH);
});
