import { beforeEach, describe, expect, it } from "vitest";

import {
  listPublicAvailability,
  requestPublicAppointment,
} from "@/src/features/agendamentos/publicActions";
import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";
import { dominioTexts } from "@/src/shared/constants/texts";
import { actionFail, actionOk } from "@/src/shared/errors";
import { listAppointmentIds, readSlotLink, wipeCollection } from "@/tests/integration/helpers";

/**
 * Integração da vitrine pública (`src/features/agendamentos/publicActions.ts`)
 * contra Firestore **real** (Firebase Emulator Suite) — T7.
 *
 * Diferente de `tests/integration/bookingService.test.ts` (que exercita
 * `availabilityService`/`bookingService` diretamente), esta suíte chama a
 * MESMA superfície que a página pública usa: as duas Server Actions. É a
 * fronteira que o cliente público de fato atravessa — se a filtragem ou a
 * tradução de erro quebrasse só na camada de action, um teste no service não
 * detectaria.
 *
 * Como rodar: `npm run test:integration` (sobe o emulador via
 * `firebase emulators:exec` e injeta `FIRESTORE_EMULATOR_HOST`).
 *
 * Cobre CT-09 e CT-10 (CA-07/CA-08/CA-09 — T7.md §6).
 */

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "FIRESTORE_EMULATOR_HOST ausente: rode `npm run test:integration` — estes testes exigem o Firestore Emulator.",
  );
}

/** Data fixa e distante: a derivação de status compara contra "agora". */
const DATA_FUTURA = "2099-05-12";

describe("publicActions (Firestore Emulator)", () => {
  // Limpeza ANTES de cada teste (não em `afterEach`): um teste que estoura no
  // meio não deixa o seguinte herdando agendamento nem slot ocupado.
  beforeEach(async () => {
    await Promise.all([
      wipeCollection(firestorePaths.agendamentos()),
      wipeCollection(firestorePaths.disponibilidade()),
    ]);
  });

  describe("listPublicAvailability", () => {
    it(
      "CT-09 · retorna somente o slot liberado e sem agendamento ativo, " +
        "excluindo ocupado e bloqueado",
      async () => {
        await seedAppointment({ id: "ag-ocupado-001", horario: "08:00" });
        await seedDay(DATA_FUTURA, {
          "08:00": { liberado: true, agendamentoId: "ag-ocupado-001" },
          "09:00": { liberado: true, agendamentoId: null },
          "10:00": { liberado: false, agendamentoId: null },
        });

        const resultado = await listPublicAvailability(DATA_FUTURA);

        expect(resultado).toEqual(
          actionOk([
            {
              id: `${DATA_FUTURA}T09:00`,
              data: DATA_FUTURA,
              horario: "09:00",
              liberado: true,
              ocupado: false,
              statusVisual: "disponivel",
            },
          ]),
        );
      },
    );

    it("CT-09 · -> (negative companion) data sem nenhum slot liberado devolve lista vazia", async () => {
      await seedDay(DATA_FUTURA, { "07:00": { liberado: false, agendamentoId: null } });

      const resultado = await listPublicAvailability(DATA_FUTURA);

      expect(resultado).toEqual(actionOk([]));
    });
  });

  describe("requestPublicAppointment", () => {
    it.each([
      {
        caso: "ocupado por outro agendamento ativo",
        seedSlots: async () => {
          await seedAppointment({ id: "ag-original-001", horario: "11:00" });
          await seedDay(DATA_FUTURA, {
            "11:00": { liberado: true, agendamentoId: "ag-original-001" },
          });
        },
        idsEsperados: ["ag-original-001"],
        slotLinkEsperado: "ag-original-001",
      },
      {
        caso: "bloqueado pelo administrador",
        seedSlots: async () => {
          await seedDay(DATA_FUTURA, { "11:00": { liberado: false, agendamentoId: null } });
        },
        idsEsperados: [] as string[],
        slotLinkEsperado: null,
      },
    ])(
      "CT-10 · falha com conflito e nao cria solicitacao para slot $caso",
      async ({ seedSlots, idsEsperados, slotLinkEsperado }) => {
        await seedSlots();

        const resultado = await requestPublicAppointment({
          cliente: "Cliente Público",
          telefone: "11999998888",
          data: DATA_FUTURA,
          horario: "11:00",
        });

        expect(resultado).toEqual(actionFail("conflict", dominioTexts.horarioIndisponivel));

        // Nenhuma solicitação nova: o estado do banco é exatamente o de antes
        // da tentativa — nenhuma duplicidade, nenhum vínculo criado.
        expect(await listAppointmentIds()).toEqual(idsEsperados);
        expect(await readSlotLink(DATA_FUTURA, "11:00")).toBe(slotLinkEsperado);
      },
    );

    it(
      "CT-10 · -> (negative companion) slot liberado e livre e aceito, " +
        "e o mesmo horario nao aceita uma segunda solicitacao",
      async () => {
        await seedDay(DATA_FUTURA, { "12:00": { liberado: true, agendamentoId: null } });

        const aceita = await requestPublicAppointment({
          cliente: "Cliente Público",
          telefone: "11988887777",
          data: DATA_FUTURA,
          horario: "12:00",
        });

        expect(aceita.ok).toBe(true);
        if (!aceita.ok) {
          throw new Error("esperado sucesso na primeira solicitação");
        }

        const agendamentoId = aceita.data?.id;
        expect(agendamentoId).toBeDefined();
        expect(await listAppointmentIds()).toEqual([agendamentoId]);
        expect(await readSlotLink(DATA_FUTURA, "12:00")).toBe(agendamentoId);

        // O mesmo horário, agora ocupado pela primeira solicitação, recusa a
        // segunda — exatamente o cenário de CT-10 acima, produzido pela própria
        // primeira chamada em vez de seed manual.
        const recusada = await requestPublicAppointment({
          cliente: "Outro Cliente",
          telefone: "11977776666",
          data: DATA_FUTURA,
          horario: "12:00",
        });

        expect(recusada).toEqual(actionFail("conflict", dominioTexts.horarioIndisponivel));
        expect(await listAppointmentIds()).toEqual([agendamentoId]);
        expect(await readSlotLink(DATA_FUTURA, "12:00")).toBe(agendamentoId);
      },
    );
  });
});

/** Documento de agendamento como o repository o grava (T2). */
async function seedAppointment({
  id,
  horario,
}: {
  id: string;
  horario: string;
}): Promise<void> {
  await getFirestoreAdmin()
    .doc(firestorePaths.agendamento(id))
    .set({
      cliente: "Cliente Seed",
      telefone: "11999997777",
      profissional: "Profissional Seed",
      data: DATA_FUTURA,
      horario,
      status: "aguardando_agendamento",
      adminConfirmadoEm: null,
      profissionalConfirmadoEm: null,
      canceladoEm: null,
    });
}

async function seedDay(
  isoDate: string,
  slots: Record<string, { liberado: boolean; agendamentoId: string | null }>,
): Promise<void> {
  await getFirestoreAdmin()
    .doc(firestorePaths.disponibilidadeDoDia(isoDate))
    .set({ data: isoDate, slots, atualizadoEm: "2026-01-01T00:00:00.000Z" });
}
