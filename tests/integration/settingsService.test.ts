import { beforeEach, describe, expect, it, vi } from "vitest";

import { readConfiguredProfessionalName } from "@/src/features/agenda/services/professionalSummary";
import { bookingService } from "@/src/features/agendamentos/services/bookingService";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";
import {
  DEFAULT_APPEARANCE,
  defaultPostBookingText,
  type AppearanceSettingsDTO,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";
import { configuracoesTexts, dominioTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { AppError } from "@/src/shared/errors";
import {
  capture,
  listAppointmentIds,
  readSlotLink,
  wipeCollection,
} from "@/tests/integration/helpers";

/**
 * Integração das configurações contra Firestore **real** (Firebase Emulator
 * Suite). Nada é mockado: as invariantes desta task são sobre o que sobrevive no
 * banco — configuração recusada não pode sobrescrever a vigente, e o
 * profissional único passou a vir do documento `configuracoes/profissional`.
 *
 * Como rodar: `npm run test:integration` (sobe o emulador via
 * `firebase emulators:exec` e injeta `FIRESTORE_EMULATOR_HOST`).
 *
 * Cobre CT-17, CT-18 (textos pós-agendamento), o aceite de aparência
 * (CA-11/CA-12 no caminho persistido) e a migração do profissional único da
 * variável de ambiente para o documento de configuração — inclusive pela ponta
 * que importa, a solicitação pública que grava o nome no agendamento.
 */

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "FIRESTORE_EMULATOR_HOST ausente: rode `npm run test:integration` — estes testes exigem o Firestore Emulator.",
  );
}

/**
 * Semente do profissional único definida em `vitest.integration.config.mts`.
 * Depois da T6 ela é apenas o valor inicial: a fonte é o documento
 * `configuracoes/profissional`, e é isso que estes testes exercitam.
 */
const PROFISSIONAL_ENV = "PROFISSIONAL_UNICO_NOME";
const SEMENTE = process.env[PROFISSIONAL_ENV];

if (!SEMENTE) {
  throw new Error(
    `${PROFISSIONAL_ENV} ausente: a primeira leitura da configuração usa esta variável como semente (PRD RN-10).`,
  );
}

/** Data fixa e distante: o status do slot é derivado contra "agora". */
const DATA_FUTURA = "2099-04-20";

const TEXTOS_VALIDOS: PostBookingTextDTO = {
  titulo: "Solicitação recebida",
  descricao: "Confirmaremos o seu horário em breve.",
  dicas: ["Chegue com 10 minutos de antecedência"],
  avisos: ["Cancele com 2 horas de antecedência"],
};

const CORES_VALIDAS: AppearanceSettingsDTO = {
  corPrimaria: "#0a0a0a",
  corSecundaria: "#ededed",
  corDestaque: "#4ade80",
};

describe("settingsService (Firestore Emulator)", () => {
  // Limpeza ANTES de cada teste: um teste que estoura no meio não deixa o
  // seguinte herdando configuração nem agendamento.
  beforeEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all([
      wipeCollection(firestorePaths.configuracoes()),
      wipeCollection(firestorePaths.agendamentos()),
      wipeCollection(firestorePaths.disponibilidade()),
    ]);
  });

  describe("textos pós-agendamento", () => {
    it("CT-17 · salva titulo descricao dicas e avisos e a consulta devolve o que foi salvo", async () => {
      const salvos = await settingsService.savePostBookingText(TEXTOS_VALIDOS);

      expect(salvos).toEqual(TEXTOS_VALIDOS);

      // Persistido, não apenas devolvido pelo service.
      const documento = await readDoc(firestorePaths.configuracaoPosAgendamento());
      expect(documento).toMatchObject(TEXTOS_VALIDOS);
      expect(await settingsService.getPostBookingText()).toEqual(TEXTOS_VALIDOS);
    });

    it("CT-18 · -> (negative companion) textos invalidos falham e preservam a configuracao vigente", async () => {
      await settingsService.savePostBookingText(TEXTOS_VALIDOS);

      const erro = await capture(() =>
        settingsService.savePostBookingText({ ...TEXTOS_VALIDOS, titulo: "   " }),
      );

      expect(erro).toBeInstanceOf(AppError);
      expect((erro as AppError).code).toBe("validation");
      expect((erro as AppError).message).toBe(configuracoesTexts.tituloObrigatorio);
      expect((erro as AppError).fieldErrors).toEqual({
        titulo: configuracoesTexts.tituloObrigatorio,
      });

      // A configuração anterior sobreviveu inteira — nada foi sobrescrito.
      expect(await readDoc(firestorePaths.configuracaoPosAgendamento())).toMatchObject(
        TEXTOS_VALIDOS,
      );
      expect(await settingsService.getPostBookingText()).toEqual(TEXTOS_VALIDOS);
    });

    it("sem configuracao salva devolve o texto minimo padrao", async () => {
      expect(await settingsService.getPostBookingText()).toEqual(defaultPostBookingText());
    });

    it("documento fora do contrato e ignorado e a leitura cai no padrao", async () => {
      // Só chega assim por edição manual no console do Firebase.
      await seedDoc(firestorePaths.configuracaoPosAgendamento(), {
        titulo: "",
        descricao: "Confirmaremos o seu horário em breve.",
        dicas: [],
        avisos: [],
      });

      expect(await settingsService.getPostBookingText()).toEqual(defaultPostBookingText());
    });
  });

  describe("aparencia da area do cliente", () => {
    it("salva cores legiveis normalizadas e a consulta devolve as cores salvas", async () => {
      const salvas = await settingsService.saveAppearanceSettings({
        corPrimaria: "#0A0A0A",
        corSecundaria: "#EDEDED",
        corDestaque: "#4ADE80",
      });

      expect(salvas).toEqual(CORES_VALIDAS);
      expect(await readDoc(firestorePaths.configuracaoAparencia())).toMatchObject(
        CORES_VALIDAS,
      );
      expect(await settingsService.getAppearanceSettings()).toEqual(CORES_VALIDAS);
    });

    it("-> (negative companion) cores ilegiveis falham e preservam a aparencia vigente", async () => {
      await settingsService.saveAppearanceSettings(CORES_VALIDAS);

      const erro = await capture(() =>
        settingsService.saveAppearanceSettings({
          corPrimaria: "#111111",
          corSecundaria: "#222222",
          corDestaque: "#4ade80",
        }),
      );

      expect(erro).toBeInstanceOf(AppError);
      expect((erro as AppError).code).toBe("validation");
      expect((erro as AppError).message).toBe(feedbackTexts.coresInvalidas);
      expect((erro as AppError).fieldErrors).toEqual({
        corPrimaria: feedbackTexts.coresInvalidas,
        corSecundaria: feedbackTexts.coresInvalidas,
      });

      expect(await readDoc(firestorePaths.configuracaoAparencia())).toMatchObject(
        CORES_VALIDAS,
      );
      expect(await settingsService.getAppearanceSettings()).toEqual(CORES_VALIDAS);
    });

    it("sem configuracao salva devolve as cores padrao do produto", async () => {
      expect(await settingsService.getAppearanceSettings()).toEqual(DEFAULT_APPEARANCE);
    });
  });

  /**
   * Migração da T6: a fonte do profissional único deixou de ser a variável de
   * ambiente e passou a ser `configuracoes/profissional`. A variável sobrou
   * apenas como semente da primeira leitura.
   */
  describe("profissional unico", () => {
    it("semeia configuracoes/profissional na primeira leitura, a partir da variavel de ambiente", async () => {
      expect(await readDoc(firestorePaths.configuracaoProfissional())).toBeNull();

      expect(await settingsService.getConfiguredProfessional()).toBe(SEMENTE);

      // A semeadura é o que torna o documento a fonte a partir daqui.
      expect(await readDoc(firestorePaths.configuracaoProfissional())).toMatchObject({
        nome: SEMENTE,
      });
    });

    it("le o documento configurado, e nao mais a variavel de ambiente", async () => {
      const configurado = "Configurada no Firestore";
      // Valor diferente da semente: se alguma leitura ainda usasse a variável de
      // ambiente, ela devolveria `SEMENTE` e este teste falharia.
      expect(configurado).not.toBe(SEMENTE);
      await seedDoc(firestorePaths.configuracaoProfissional(), { nome: configurado });

      expect(await settingsService.getConfiguredProfessional()).toBe(configurado);
      // Mesma fonte para a Agenda administrativa (PRD US-07).
      expect(await readConfiguredProfessionalName()).toBe(configurado);
    });

    it("a solicitacao publica grava o profissional do documento de configuracao", async () => {
      const configurado = "Configurada no Firestore";
      await seedDoc(firestorePaths.configuracaoProfissional(), { nome: configurado });
      await seedDay(DATA_FUTURA, "09:00");

      const criado = await bookingService.requestAppointmentAtomically({
        cliente: "Cliente Seis",
        telefone: "11933332222",
        data: DATA_FUTURA,
        horario: "09:00",
      });

      expect(criado.profissional).toBe(configurado);
      expect(await readDoc(firestorePaths.agendamento(criado.id))).toMatchObject({
        profissional: configurado,
      });
    });

    it("-> (negative companion) sem documento e sem semente, a solicitacao publica falha e nada e gravado", async () => {
      vi.stubEnv(PROFISSIONAL_ENV, "");
      await seedDay(DATA_FUTURA, "09:00");

      const erro = await capture(() =>
        bookingService.requestAppointmentAtomically({
          cliente: "Cliente Sete",
          telefone: "11922221111",
          data: DATA_FUTURA,
          horario: "09:00",
        }),
      );

      expect(erro).toBeInstanceOf(AppError);
      expect((erro as AppError).code).toBe("unavailable");
      expect((erro as AppError).message).toBe(dominioTexts.servicoIndisponivel);

      // Nenhum agendamento e nenhum vínculo de slot: a recusa acontece antes da
      // transação de reserva.
      expect(await listAppointmentIds()).toEqual([]);
      expect(await readSlotLink(DATA_FUTURA, "09:00")).toBeNull();
      // E nada foi semeado: sem semente não existe documento a criar.
      expect(await readDoc(firestorePaths.configuracaoProfissional())).toBeNull();
    });

    it("-> (negative companion) sem documento e sem semente, a Agenda administrativa mostra nao configurado", async () => {
      vi.stubEnv(PROFISSIONAL_ENV, "");

      expect(await readConfiguredProfessionalName()).toBeNull();
      expect(await settingsService.getConfiguredProfessional()).toBeNull();
    });

    it("apara o nome persistido com espaco as pontas", async () => {
      await seedDoc(firestorePaths.configuracaoProfissional(), {
        nome: "  Profissional CrossHill  ",
      });

      expect(await settingsService.getConfiguredProfessional()).toBe(
        "Profissional CrossHill",
      );
    });

    it("documento com nome vazio cai na semente da variavel de ambiente", async () => {
      await seedDoc(firestorePaths.configuracaoProfissional(), { nome: "   " });

      expect(await settingsService.getConfiguredProfessional()).toBe(SEMENTE);
      expect(await readDoc(firestorePaths.configuracaoProfissional())).toMatchObject({
        nome: SEMENTE,
      });
    });
  });
});

async function seedDoc(path: string, dados: Record<string, unknown>): Promise<void> {
  await getFirestoreAdmin().doc(path).set(dados);
}

/** Um horário liberado e livre na data — o mínimo para uma solicitação. */
async function seedDay(isoDate: string, horario: string): Promise<void> {
  await getFirestoreAdmin()
    .doc(firestorePaths.disponibilidadeDoDia(isoDate))
    .set({
      data: isoDate,
      slots: { [horario]: { liberado: true, agendamentoId: null } },
      atualizadoEm: "2026-01-01T00:00:00.000Z",
    });
}

async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const snapshot = await getFirestoreAdmin().doc(path).get();

  return snapshot.exists ? (snapshot.data() ?? {}) : null;
}
