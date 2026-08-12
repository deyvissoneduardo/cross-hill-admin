import "server-only";

import { settingsRepository } from "@/src/features/configuracoes/repositories/settingsRepository";
import {
  DEFAULT_APPEARANCE,
  defaultPostBookingText,
  type AppearanceSettingsDTO,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import {
  validateClientColors,
  type AppearanceSettingsInput,
} from "@/src/features/configuracoes/validators/colorValidator";
import {
  validatePostBookingText,
  type PostBookingTextInput,
} from "@/src/features/configuracoes/validators/textSettingsValidator";
import { feedbackTexts } from "@/src/shared/constants/texts";
import { AppError, withDomainErrors } from "@/src/shared/errors";

/**
 * Regras de configuração: aparência da área do cliente, textos pós-agendamento
 * e leitura do profissional único (PRD US-07/US-08/US-09).
 *
 * Contrato da camada, igual ao dos demais services da feature:
 *
 * - **Validação antes de qualquer escrita.** É o que cumpre CA-12/CA-13: payload
 *   recusado nunca chega ao repository, então a configuração anterior continua
 *   inteira — não existe caminho de "gravou metade e falhou".
 * - **Erro que sai daqui é `AppError`.** Recusa de conteúdo vira `validation`
 *   com `fieldErrors` (a UI destaca o campo); falha de infraestrutura vira
 *   `unavailable` via `withDomainErrors`, sem detalhe de SDK.
 * - **Configuração ausente não é erro.** Leitura devolve o padrão do produto: a
 *   área do cliente precisa de cores e textos mesmo no primeiro acesso, antes de
 *   o administrador salvar qualquer coisa (`design.md` §5).
 * - **O profissional único é somente leitura** (PRD RN-11): nenhuma função de
 *   escrita existe aqui, e a semeadura do documento é detalhe do repository.
 * - **`now` é injetável** (default `new Date()`), como em `availabilityService`:
 *   o carimbo de atualização é entrada da operação, não relógio escondido.
 */

/** Prefixo de log da feature — `withDomainErrors` aplica a política de erro. */
const ESCOPO = "configuracoes";

/** Cores configuradas, ou o padrão do produto quando não há configuração. */
export async function getAppearanceSettings(): Promise<AppearanceSettingsDTO> {
  return withDomainErrors(ESCOPO, "aparencia", async () => {
    return (await settingsRepository.readAppearance()) ?? DEFAULT_APPEARANCE;
  });
}

/**
 * Salva as cores da área do cliente (PRD CA-11/CA-12).
 *
 * Par ilegível é recusado com `validation` e a mensagem do design ("Ajuste as
 * cores para manter a leitura confortável."), sem nenhuma escrita.
 */
export async function saveAppearanceSettings(
  input: AppearanceSettingsInput,
  now: Date = new Date(),
): Promise<AppearanceSettingsDTO> {
  const resultado = validateClientColors(input);

  if (!resultado.valido) {
    // Motivo, não conteúdo: o log diz por que recusou sem repetir a configuração.
    console.warn("[configuracoes] aparência recusada", { motivo: resultado.motivo });

    throw new AppError("validation", feedbackTexts.coresInvalidas, {
      fieldErrors: resultado.fieldErrors,
    });
  }

  return withDomainErrors(ESCOPO, "salvar-aparencia", () =>
    settingsRepository.saveAppearance(resultado.cores, now),
  );
}

/** Textos configurados, ou o texto mínimo padrão (`design.md` §5). */
export async function getPostBookingText(): Promise<PostBookingTextDTO> {
  return withDomainErrors(ESCOPO, "pos-agendamento", async () => {
    return (await settingsRepository.readPostBookingText()) ?? defaultPostBookingText();
  });
}

/**
 * Salva os textos exibidos ao cliente após a solicitação (PRD CA-13).
 *
 * Conteúdo inválido (título vazio, texto longo demais, marcação) é recusado com
 * a mensagem do campo — e a configuração vigente permanece exatamente como
 * estava, porque a validação acontece antes de qualquer escrita.
 */
export async function savePostBookingText(
  input: PostBookingTextInput,
  now: Date = new Date(),
): Promise<PostBookingTextDTO> {
  const resultado = validatePostBookingText(input);

  if (!resultado.valido) {
    console.warn("[configuracoes] textos recusados", { motivo: resultado.motivo });

    throw new AppError("validation", primeiraMensagem(resultado.fieldErrors), {
      fieldErrors: resultado.fieldErrors,
    });
  }

  return withDomainErrors(ESCOPO, "salvar-textos", () =>
    settingsRepository.savePostBookingText(resultado.textos, now),
  );
}

/** Profissional único configurado, ou `null` (PRD US-07/RN-11 — sem escrita). */
export async function getConfiguredProfessional(): Promise<string | null> {
  return withDomainErrors(ESCOPO, "profissional", () =>
    settingsRepository.readProfessionalName(),
  );
}

export const settingsService = {
  getAppearanceSettings,
  saveAppearanceSettings,
  getPostBookingText,
  savePostBookingText,
  getConfiguredProfessional,
} as const;

/**
 * Mensagem do campo recusado, para o banner/toast. O validator devolve um campo
 * por vez, então esta é a mensagem daquele campo — nunca uma genérica que
 * obrigaria o administrador a caçar o erro na tela.
 */
function primeiraMensagem(fieldErrors: Record<string, string>): string {
  return Object.values(fieldErrors)[0] ?? feedbackTexts.falhaSalvarConfiguracoes;
}
