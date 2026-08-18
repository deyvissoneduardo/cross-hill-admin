import "server-only";

import {
  appointmentRepository,
  type NewAppointmentInput,
} from "@/src/features/agendamentos/repositories/appointmentRepository";
import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { appointmentValidators } from "@/src/features/agendamentos/validators/appointmentValidators";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";
import { dominioTexts } from "@/src/shared/constants/texts";
import { AppError, withDomainErrors } from "@/src/shared/errors";
import { syncAppointmentBestEffort } from "@/src/features/google-calendar/googleCalendarService";

/**
 * Regras de agendamento: listagem ativa, confirmação administrativa,
 * cancelamento com liberação de horário e solicitação pública atômica.
 *
 * Contrato da camada:
 *
 * - **Nada de React aqui.** É consumido por Server Actions e Server Components;
 *   a UI recebe apenas os DTOs serializáveis devolvidos por estas funções.
 * - **Toda entrada atravessa `appointmentValidators`** antes de chegar ao
 *   Firestore. O id vem de um `formData`/parâmetro de rota, então "string" não é
 *   garantia de nada.
 * - **Erro que sai daqui é `AppError`.** Falha de infraestrutura é registrada e
 *   convertida em `unavailable` por `withDomainErrors`, para a Server Action
 *   nunca serializar detalhe de SDK para o cliente (tech_spec §9).
 * - **`now` é injetável em toda função pública** (default `new Date()`): o status
 *   exibível é derivado da comparação com o instante do atendimento, então o
 *   relógio é entrada da regra, não estado escondido. É a mesma cadeia
 *   determinística que `shared/time` e os repositories já exigem (`now`
 *   obrigatório) — nenhum call site de produção precisa passá-lo.
 * - **Autorização não é responsabilidade daqui**: quem protege a ação
 *   administrativa é `adminAction()`/`assertAdminSession()` (T1). Estas funções
 *   assumem que a guarda já rodou — exceto `requestAppointmentAtomically`, que é
 *   o caminho público por definição.
 */

/** Prefixo de log da feature — `withDomainErrors` aplica a política de erro. */
const ESCOPO = "agendamentos";

/**
 * Solicitação pública de agendamento, ainda sem normalização.
 *
 * **Não tem `profissional` de propósito.** A v1 opera com um profissional único
 * previamente configurado, e o administrador não o cria nem edita pela interface
 * (PRD RN-10/RN-11): é configuração do estabelecimento, não campo do formulário.
 * Aceitá-lo aqui deixaria quem solicita — caminho público, não autenticado —
 * gravar o valor que quisesse nesse campo, e o painel exibiria um profissional
 * que ninguém configurou. O valor é resolvido internamente.
 */
export type AppointmentRequestInput = {
  cliente: string;
  telefone: string;
  data: string;
  horario: string;
};

/** Agendamentos em acompanhamento — cancelados nunca entram (PRD RN-02). */
export async function listActiveAppointments(
  now: Date = new Date(),
): Promise<AppointmentDTO[]> {
  return withDomainErrors(ESCOPO, "listagem", async () => {
    const [agendamentos, profissional] = await Promise.all([
      appointmentRepository.listActive(now),
      readProfessionalForDisplay(),
    ]);

    return profissional === null
      ? agendamentos
      : agendamentos.map((agendamento) => ({ ...agendamento, profissional }));
  });
}

/**
 * Registra a confirmação administrativa.
 *
 * Idempotente no estado e explícita no retorno: a segunda tentativa não
 * sobrescreve o timestamp da primeira e recebe `conflict` com a mensagem de
 * confirmação duplicada, que é o que a UI exibe (`design.md` §5.1).
 *
 * Confirmar NÃO muda o status canônico: com profissional e administrador
 * confirmados, o agendamento segue em `aguardando agendamento` até a chegada do
 * horário (PRD RN-15/RN-16).
 */
export async function confirmAdminAppointment(
  agendamentoId: string,
  now: Date = new Date(),
): Promise<AppointmentDTO> {
  const id = appointmentValidators.assertAppointmentId(agendamentoId);

  return withDomainErrors(ESCOPO, "confirmacao", async () => {
    const confirmado = await applyProfessionalForDisplay(
      await appointmentRepository.confirmAdmin(id, now),
    );
    // A confirmação administrativa deve aparecer imediatamente como confirmada
    // no calendário externo, ainda que o status histórico da UI só seja derivado
    // como final em outra etapa do domínio.
    await syncAppointmentBestEffort({ ...confirmado, status: "confirmado" });
    return confirmado;
  });
}

/**
 * Cancela o agendamento, registra `canceladoEm` e libera o horário (PRD CA-05).
 *
 * Cancelamento de agendamento inexistente falha com `not_found` sem tocar em
 * disponibilidade alguma — o efeito colateral é a parte perigosa desta operação.
 */
export async function cancelAppointment(
  agendamentoId: string,
  now: Date = new Date(),
): Promise<AppointmentDTO> {
  const id = appointmentValidators.assertAppointmentId(agendamentoId);

  return withDomainErrors(ESCOPO, "cancelamento", async () => {
    const cancelado = await applyProfessionalForDisplay(
      await appointmentRepository.cancelReleasingSlot(id, now),
    );
    await syncAppointmentBestEffort(cancelado);
    return cancelado;
  });
}

/**
 * Cria a solicitação pública ocupando o horário atomicamente (PRD CA-08/CA-09).
 *
 * De duas solicitações simultâneas para o mesmo horário, no máximo uma é aceita;
 * a outra recebe `conflict` ("Horário indisponível.") e nada é gravado por ela.
 *
 * O profissional NÃO vem do payload: é resolvido da configuração
 * (`resolveProfissionalUnico`), conforme RN-10/RN-11.
 *
 * PENDÊNCIA (fora do escopo desta task): este é o único caminho de escrita não
 * autenticado da aplicação e não tem fronteira de abuso — sem rate-limit por IP/
 * telefone, um script pode esgotar a agenda solicitando todos os horários
 * liberados. O dano é contido (a transação impede overbooking e o administrador
 * cancela em massa), mas a lacuna é real e precisa de decisão de produto sobre
 * onde a barreira mora (borda/proxy, App Check ou contador em Firestore).
 */
export async function requestAppointmentAtomically(
  input: AppointmentRequestInput,
  now: Date = new Date(),
): Promise<AppointmentDTO> {
  const normalizado: NewAppointmentInput = {
    cliente: appointmentValidators.assertCustomerName(input.cliente),
    telefone: appointmentValidators.assertPhone(input.telefone),
    profissional: await resolveProfissionalUnico(),
    data: appointmentValidators.assertIsoDate(input.data),
    horario: appointmentValidators.assertTimeOfDay(input.horario),
  };

  return withDomainErrors(ESCOPO, "reserva", async () => {
    const appointment = await appointmentRepository.createOccupyingSlot(normalizado, now);
    await syncAppointmentBestEffort(appointment);
    return appointment;
  });
}

export const bookingService = {
  listActiveAppointments,
  confirmAdminAppointment,
  cancelAppointment,
  requestAppointmentAtomically,
} as const;

/**
 * Profissional único da v1, vindo da configuração — nunca do requisitante.
 *
 * A fonte é o documento `configuracoes/profissional`, lido pela feature dona da
 * configuração através de `settingsService.getConfiguredProfessional()` (T6).
 * A entrada é pelo **service**, não pelo repository: `configuracoes` é outra
 * feature, e atravessar direto para a persistência dela pularia a política de
 * erro que ela aplica (`withDomainErrors`) e amarraria `agendamentos` ao formato
 * do documento. Quem semeia esse documento na primeira leitura, a partir de
 * `PROFISSIONAL_UNICO_NOME`, é o repository de `configuracoes` — este service não
 * conhece variável de ambiente nem caminho de coleção.
 *
 * Configuração ausente ou inválida é indisponibilidade, não erro de validação:
 * quem solicitou não tem como corrigir (nem enviou o campo), e aceitar a
 * solicitação sem profissional gravaria um agendamento que o painel e as mensagens
 * não conseguem exibir. Falha de leitura da configuração cai no mesmo lugar: sem
 * saber o profissional, a reserva não pode ser gravada — o `unavailable` que o
 * service de `configuracoes` já produz é reetiquetado aqui com a mensagem do
 * fluxo de reserva, sem vazar o motivo interno.
 */
async function resolveProfissionalUnico(): Promise<string> {
  try {
    const configurado = await settingsService.getConfiguredProfessional();

    return appointmentValidators.assertProfessional(configurado);
  } catch (error) {
    // O erro do validador não pode subir como está: ele aponta
    // `fieldErrors.profissional`, um campo que o formulário público não tem. E o
    // log registra apenas o tipo da falha, nunca a configuração em si.
    console.error("[agendamentos] configuração de profissional indisponível", {
      tipo: error instanceof Error ? error.name : typeof error,
    });
    throw new AppError("unavailable", dominioTexts.servicoIndisponivel);
  }
}

/**
 * Nome usado nos cards e mensagens. Falha de configuração não pode transformar
 * uma confirmação já persistida em aparente erro da ação; nesse caso o DTO
 * conserva o identificador que veio do agendamento e a causa permanece no log.
 */
async function applyProfessionalForDisplay(
  agendamento: AppointmentDTO,
): Promise<AppointmentDTO> {
  const profissional = await readProfessionalForDisplay();
  return profissional === null ? agendamento : { ...agendamento, profissional };
}

async function readProfessionalForDisplay(): Promise<string | null> {
  try {
    const profissional = await settingsService.getConfiguredProfessional();
    return typeof profissional === "string" && profissional.trim().length > 0
      ? profissional.trim()
      : null;
  } catch {
    return null;
  }
}
