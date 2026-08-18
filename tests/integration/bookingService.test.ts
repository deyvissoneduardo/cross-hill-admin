import { beforeEach, describe, expect, it } from "vitest";

import { availabilityService } from "@/src/features/agenda/services/availabilityService";
import { MAX_AGENDAMENTOS_ATIVOS } from "@/src/features/agendamentos/repositories/appointmentRepository";
import {
  bookingService,
  type AppointmentRequestInput,
} from "@/src/features/agendamentos/services/bookingService";
import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";
import { dominioTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { AppError } from "@/src/shared/errors";
import {
  capture,
  listAppointmentIds,
  readSlotLink,
  wipeCollection,
} from "@/tests/integration/helpers";

/**
 * Integração de domínio contra Firestore **real** (Firebase Emulator Suite).
 *
 * Nada é mockado: as invariantes desta task (cancelamento libera horário,
 * concorrência aceita no máximo uma reserva) só existem no comportamento
 * transacional do banco — um dublê de repository as validaria por construção e
 * não detectaria nada.
 *
 * Como rodar: `npm run test:integration` (sobe o emulador via
 * `firebase emulators:exec` e injeta `FIRESTORE_EMULATOR_HOST`).
 *
 * Cobre CT-05, CT-06, CT-11, CT-12 e os aceites de confirmação administrativa e
 * preservação do status canônico (§4 do T2), mais as invariantes de listagem e de
 * origem do profissional: o corte do teto é cronológico, um documento corrompido
 * não derruba a listagem, o profissional vem da configuração (nunca do payload) e
 * o relógio é entrada das derivações (injetável, não `new Date()` escondido).
 */

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "FIRESTORE_EMULATOR_HOST ausente: rode `npm run test:integration` — estes testes exigem o Firestore Emulator.",
  );
}

/**
 * Profissional único da v1 (PRD RN-10/RN-11): configuração do estabelecimento,
 * guardada em `configuracoes/profissional` desde a T6 e semeada aqui a cada
 * teste. A solicitação pública NÃO envia este valor — o service o resolve da
 * configuração, e é isso que os testes de reserva asseram no documento gravado.
 *
 * O valor vem de `vitest.integration.config.mts` porque é também a semente de
 * implantação usada pelo repository quando o documento ainda não existe; a
 * origem da leitura em si (documento vs. variável) é exercitada em
 * `tests/integration/settingsService.test.ts`.
 */
const PROFISSIONAL = process.env.PROFISSIONAL_UNICO_NOME;

if (!PROFISSIONAL) {
  throw new Error(
    "PROFISSIONAL_UNICO_NOME ausente: a solicitação pública resolve o profissional da configuração (PRD RN-10).",
  );
}

/**
 * Datas fixas e distantes, nunca `new Date()`: a derivação de status compara o
 * horário do atendimento com "agora", então uma data relativa faria o mesmo
 * teste mudar de resultado conforme o dia/fuso em que a suíte roda.
 */
const DATA_FUTURA = "2099-03-10";
const DATA_PASSADA = "2020-03-10";
const TIMESTAMP_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type SeedAppointment = {
  id: string;
  data?: string;
  horario?: string;
  cliente?: string;
  status?: string;
  adminConfirmadoEm?: string | null;
  profissionalConfirmadoEm?: string | null;
  canceladoEm?: string | null;
};

describe("bookingService + availabilityService (Firestore Emulator)", () => {
  // Limpeza ANTES de cada teste (não em `afterEach`): um teste que estoura no
  // meio não deixa o seguinte herdando agendamento nem slot ocupado.
  beforeEach(async () => {
    await Promise.all([
      wipeCollection(firestorePaths.agendamentos()),
      wipeCollection(firestorePaths.disponibilidade()),
      // Profissional único explícito no documento de configuração (T6): a
      // reserva pública o lê de lá, não da variável de ambiente.
      seedProfessional(),
    ]);
  });

  it("lista documento no schema implantado com telefone E.164 brasileiro", async () => {
    await getFirestoreAdmin().doc(firestorePaths.agendamento("ag-schema-real")).set({
      nomeCliente: "Cliente Firestore",
      telefoneExibicao: "(11) 99999-8888",
      telefoneNormalizado: "5511999998888",
      profissionalId: "profissional-001",
      data: DATA_FUTURA,
      horario: "09:00",
      status: "AGUARDANDO_CONFIRMACAO",
      criadoEm: new Date("2026-08-17T12:00:00.000Z"),
    });

    const ativos = await bookingService.listActiveAppointments();

    expect(ativos).toHaveLength(1);
    expect(ativos[0]).toMatchObject({
      id: "ag-schema-real",
      cliente: "Cliente Firestore",
      telefone: "11999998888",
      profissional: PROFISSIONAL,
      status: "aguardando_agendamento",
    });
  });

  it("cancelarAgendamento mantem o card cancelado e torna slot disponivel", async () => {
    await seedAppointment({ id: "ag-cancel-001", horario: "09:00" });
    await seedDay(DATA_FUTURA, {
      "09:00": { liberado: true, agendamentoId: "ag-cancel-001" },
    });

    const cancelado = await bookingService.cancelAppointment("ag-cancel-001");

    expect(cancelado.status).toBe("cancelado");
    expect(cancelado.canceladoEm).toMatch(TIMESTAMP_ISO);

    // Permanece no histórico visível do painel com o status cancelado.
    expect(await bookingService.listActiveAppointments()).toEqual([
      expect.objectContaining({ id: "ag-cancel-001", status: "cancelado" }),
    ]);

    // E o horário volta para a vitrine pública, solicitável.
    expect(await availabilityService.listBookableSlots(DATA_FUTURA)).toEqual([
      {
        id: `${DATA_FUTURA}T09:00`,
        data: DATA_FUTURA,
        horario: "09:00",
        liberado: true,
        ocupado: false,
        statusVisual: "disponivel",
      },
    ]);

    // Persistido, não apenas devolvido pelo service.
    const documento = await readAppointmentDoc("ag-cancel-001");
    expect(documento.status).toBe("cancelado");
    expect(documento.canceladoEm).toBe(cancelado.canceladoEm);
    expect(await readSlotLink(DATA_FUTURA, "09:00")).toBeNull();
  });

  it("cancelarAgendamento inexistente nao libera slots indevidos", async () => {
    await seedAppointment({ id: "ag-controle-001", horario: "10:00" });
    await seedDay(DATA_FUTURA, {
      "10:00": { liberado: true, agendamentoId: "ag-controle-001" },
    });

    const erro = await capture(() => bookingService.cancelAppointment("ag-inexistente"));

    expect(erro).toBeInstanceOf(AppError);
    expect((erro as AppError).code).toBe("not_found");
    expect((erro as AppError).message).toBe(dominioTexts.agendamentoNaoEncontrado);

    // Slot de controle permanece indisponível e vinculado ao agendamento certo.
    expect(await availabilityService.listDaySlots(DATA_FUTURA)).toEqual([
      {
        id: `${DATA_FUTURA}T10:00`,
        data: DATA_FUTURA,
        horario: "10:00",
        liberado: true,
        ocupado: true,
        statusVisual: "ocupado",
      },
    ]);
    expect(await availabilityService.listBookableSlots(DATA_FUTURA)).toEqual([]);
    expect(await readSlotLink(DATA_FUTURA, "10:00")).toBe("ag-controle-001");

    const ativos = await bookingService.listActiveAppointments();
    expect(ativos.map((agendamento) => agendamento.id)).toEqual(["ag-controle-001"]);
    expect(ativos[0].canceladoEm).toBeNull();
  });

  it("cancelarAgendamento ja cancelado falha sem regravar o cancelamento", async () => {
    const canceladoEmOriginal = "2026-01-02T03:04:05.000Z";
    await seedAppointment({
      id: "ag-cancelado-001",
      horario: "09:00",
      status: "cancelado",
      canceladoEm: canceladoEmOriginal,
    });
    // Agendamento ativo de controle, em outro horário: a recusa não pode mexer
    // em disponibilidade não relacionada.
    await seedAppointment({ id: "ag-controle-002", horario: "10:00" });
    await seedDay(DATA_FUTURA, {
      // O horário do já cancelado está livre — o primeiro cancelamento o liberou.
      "09:00": { liberado: true, agendamentoId: null },
      "10:00": { liberado: true, agendamentoId: "ag-controle-002" },
    });

    const erro = await capture(() =>
      bookingService.cancelAppointment("ag-cancelado-001"),
    );

    expect(erro).toBeInstanceOf(AppError);
    expect((erro as AppError).code).toBe("conflict");
    expect((erro as AppError).message).toBe(dominioTexts.agendamentoJaCancelado);

    // Cancelamento é idempotente no estado: o timestamp original não é regravado
    // (é isto que distingue "recusou" de "cancelou de novo por cima").
    const documento = await readAppointmentDoc("ag-cancelado-001");
    expect(documento.canceladoEm).toBe(canceladoEmOriginal);
    expect(documento.status).toBe("cancelado");

    // Nenhum slot mudou — nem o do agendamento cancelado, nem o de controle.
    expect(await readDaySlots(DATA_FUTURA)).toEqual({
      "09:00": { liberado: true, agendamentoId: null },
      "10:00": { liberado: true, agendamentoId: "ag-controle-002" },
    });

    const ativos = await bookingService.listActiveAppointments();
    expect(ativos.map((agendamento) => agendamento.id)).toEqual([
      "ag-cancelado-001",
      "ag-controle-002",
    ]);
  });

  it("transacaoDeReserva aceita apenas uma solicitacao concorrente por slot", async () => {
    await seedDay(DATA_FUTURA, { "11:00": { liberado: true, agendamentoId: null } });

    const resultados = await Promise.allSettled([
      solicitar("Cliente Um", "11988887777", "11:00"),
      solicitar("Cliente Dois", "11977776666", "11:00"),
    ]);

    const aceitas = resultados.filter(isFulfilled);
    const recusadas = resultados.filter(isRejected);

    expect(aceitas).toHaveLength(1);
    expect(recusadas).toHaveLength(1);
    expect(recusadas[0].reason).toBeInstanceOf(AppError);
    expect((recusadas[0].reason as AppError).code).toBe("conflict");
    expect((recusadas[0].reason as AppError).message).toBe(
      dominioTexts.horarioIndisponivel,
    );

    const vencedor = aceitas[0].value;
    expect(vencedor.status).toBe("aguardando_agendamento");

    // O profissional NÃO veio do payload (a solicitação pública não tem o campo):
    // foi resolvido da configuração do estabelecimento (PRD RN-10/RN-11).
    expect(vencedor.profissional).toBe(PROFISSIONAL);
    expect((await readAppointmentDoc(vencedor.id)).profissional).toBe(PROFISSIONAL);

    // Exatamente um agendamento no banco, e é o da operação bem-sucedida.
    const todos = await listAppointmentIds();
    expect(todos).toEqual([vencedor.id]);
    expect(await readSlotLink(DATA_FUTURA, "11:00")).toBe(vencedor.id);
    expect(await availabilityService.listBookableSlots(DATA_FUTURA)).toEqual([]);
  });

  it("transacaoDeReserva rejeita slot previamente ocupado", async () => {
    await seedAppointment({
      id: "ag-ocupado-001",
      cliente: "Cliente Original",
      horario: "12:00",
    });
    await seedDay(DATA_FUTURA, {
      "12:00": { liberado: true, agendamentoId: "ag-ocupado-001" },
    });

    const resultados = await Promise.allSettled([
      solicitar("Cliente Tres", "11966665555", "12:00"),
      solicitar("Cliente Quatro", "11955554444", "12:00"),
    ]);

    expect(resultados.filter(isFulfilled)).toHaveLength(0);
    for (const resultado of resultados.filter(isRejected)) {
      expect(resultado.reason).toBeInstanceOf(AppError);
      expect((resultado.reason as AppError).code).toBe("conflict");
      expect((resultado.reason as AppError).message).toBe(
        dominioTexts.horarioIndisponivel,
      );
    }

    // Nenhuma criação: o agendamento original é o único, intacto.
    expect(await listAppointmentIds()).toEqual(["ag-ocupado-001"]);
    expect((await readAppointmentDoc("ag-ocupado-001")).cliente).toBe(
      "Cliente Original",
    );
    expect(await readSlotLink(DATA_FUTURA, "12:00")).toBe("ag-ocupado-001");
  });

  it("confirmAdminAppointment rejeita confirmacao duplicada preservando o timestamp", async () => {
    await seedAppointment({ id: "ag-confirma-001", horario: "13:00" });

    const primeira = await bookingService.confirmAdminAppointment("ag-confirma-001");

    expect(primeira.adminConfirmadoEm).toMatch(TIMESTAMP_ISO);
    expect(primeira.confirmadoPrimeiroPor).toBe("admin");
    expect(primeira.status).toBe("aguardando_agendamento");

    const erro = await capture(() =>
      bookingService.confirmAdminAppointment("ag-confirma-001"),
    );

    expect(erro).toBeInstanceOf(AppError);
    expect((erro as AppError).code).toBe("conflict");
    expect((erro as AppError).message).toBe(feedbackTexts.confirmacaoDuplicada);

    // Idempotente no estado: a segunda tentativa não regravou o timestamp.
    expect((await readAppointmentDoc("ag-confirma-001")).adminConfirmadoEm).toBe(
      primeira.adminConfirmadoEm,
    );
  });

  it("confirmAdminAppointment recusa agendamento cancelado", async () => {
    const canceladoEmOriginal = "2026-01-02T03:04:05.000Z";
    await seedAppointment({
      id: "ag-confirma-002",
      horario: "14:00",
      status: "cancelado",
      canceladoEm: canceladoEmOriginal,
    });

    const erro = await capture(() =>
      bookingService.confirmAdminAppointment("ag-confirma-002"),
    );

    expect(erro).toBeInstanceOf(AppError);
    expect((erro as AppError).code).toBe("conflict");
    expect((erro as AppError).message).toBe(dominioTexts.agendamentoCancelado);

    // Cancelado não recebe confirmação administrativa: o documento sai intacto.
    const documento = await readAppointmentDoc("ag-confirma-002");
    expect(documento.adminConfirmadoEm).toBeNull();
    expect(documento.canceladoEm).toBe(canceladoEmOriginal);
    expect(documento.status).toBe("cancelado");
  });

  it.each([
    {
      caso: "antes do horario do atendimento",
      data: DATA_FUTURA,
      statusEsperado: "aguardando_agendamento",
    },
    {
      caso: "depois do horario do atendimento",
      data: DATA_PASSADA,
      statusEsperado: "confirmado",
    },
  ])(
    "com as duas confirmacoes, status fica $statusEsperado $caso",
    async ({ data, statusEsperado }) => {
      await seedAppointment({
        id: "ag-status-001",
        data,
        horario: "09:00",
        profissionalConfirmadoEm: "2019-05-04T12:00:00.000Z",
      });

      const confirmado = await bookingService.confirmAdminAppointment("ag-status-001");

      expect(confirmado.status).toBe(statusEsperado);
      expect(confirmado.confirmadoPrimeiroPor).toBe("profissional");
      // O campo persistido nunca vira "confirmado" sozinho (PRD RN-15).
      expect((await readAppointmentDoc("ag-status-001")).status).toBe(
        "aguardando_agendamento",
      );
    },
  );

  it("solicitacao publica ignora profissional enviado no payload", async () => {
    await seedDay(DATA_FUTURA, { "15:00": { liberado: true, agendamentoId: null } });

    // O tipo público não tem `profissional`; o cast reproduz um requisitante que
    // manda o campo de qualquer forma — o payload chega da rede, não do tipo.
    const criado = await bookingService.requestAppointmentAtomically({
      cliente: "Cliente Cinco",
      telefone: "11944443333",
      data: DATA_FUTURA,
      horario: "15:00",
      profissional: "Profissional Injetado",
    } as AppointmentRequestInput);

    expect(criado.profissional).toBe(PROFISSIONAL);
    expect((await readAppointmentDoc(criado.id)).profissional).toBe(PROFISSIONAL);
  });

  it("listagem ativa descarta agendamento corrompido e devolve os demais", async () => {
    await seedAppointment({ id: "ag-sao-001", horario: "09:00" });
    // `horario` fora do formato canônico: só chega assim por edição manual no
    // console do Firebase — e não pode derrubar a listagem inteira.
    await seedAppointment({ id: "ag-corrompido-001", horario: "manha" });

    const ativos = await bookingService.listActiveAppointments();

    expect(ativos.map((agendamento) => agendamento.id)).toEqual(["ag-sao-001"]);

    // A falha estrita continua valendo no caminho de UM documento acionável:
    // confirmar um agendamento corrompido não pode fingir sucesso.
    const erro = await capture(() =>
      bookingService.confirmAdminAppointment("ag-corrompido-001"),
    );

    expect(erro).toBeInstanceOf(AppError);
    expect((erro as AppError).code).toBe("unavailable");
  });

  it("trunca a listagem ativa por cronologia, nao pelo id gerado", async () => {
    const db = getFirestoreAdmin();
    const lote = db.batch();

    // Teto + 1 agendamentos ativos. O mais ANTIGO recebe o id que ordena por
    // último: se o corte seguisse a ordem de id (o que uma query com `!=` impõe,
    // por ordenar implicitamente por status/`__name__`), ele seria justamente o
    // descartado — o painel perderia o agendamento mais urgente e mostraria
    // apenas os distantes.
    for (let indice = 0; indice < MAX_AGENDAMENTOS_ATIVOS; indice += 1) {
      lote.set(
        db.doc(firestorePaths.agendamento(`ag-${String(indice).padStart(3, "0")}`)),
        appointmentDocument({ data: "2098-01-01", horario: "09:00" }),
      );
    }
    lote.set(
      db.doc(firestorePaths.agendamento("zz-mais-antigo")),
      appointmentDocument({ data: "2026-05-05", horario: "08:00" }),
    );
    await lote.commit();

    const ativos = await bookingService.listActiveAppointments();

    expect(ativos).toHaveLength(MAX_AGENDAMENTOS_ATIVOS);
    expect(ativos[0].id).toBe("zz-mais-antigo");

    // E a página inteira sai em ordem cronológica, não só o primeiro item.
    const cronologia = ativos.map((agendamento) => `${agendamento.data}T${agendamento.horario}`);
    expect(cronologia).toEqual([...cronologia].sort());
  });

  it("deriva o status do agendamento contra o relogio informado", async () => {
    // As duas confirmações registradas: o status só termina em `confirmado` quando
    // o instante do atendimento chega (PRD RN-15/RN-16). Com `now` injetável, a
    // fronteira é exercitada sem mexer no relógio do processo.
    await seedAppointment({
      id: "ag-relogio-001",
      data: "2026-05-05",
      horario: "09:00",
      adminConfirmadoEm: "2026-01-01T00:00:00.000Z",
      profissionalConfirmadoEm: "2026-01-02T00:00:00.000Z",
    });

    // 09:00 no fuso da operação (-03:00) é 12:00Z.
    const umSegundoAntes = await bookingService.listActiveAppointments(
      new Date("2026-05-05T11:59:59.000Z"),
    );
    const noInstanteExato = await bookingService.listActiveAppointments(
      new Date("2026-05-05T12:00:00.000Z"),
    );

    expect(umSegundoAntes[0].status).toBe("aguardando_agendamento");
    expect(noInstanteExato[0].status).toBe("confirmado");
    // O campo persistido nunca vira `confirmado` sozinho (PRD RN-15).
    expect((await readAppointmentDoc("ag-relogio-001")).status).toBe(
      "aguardando_agendamento",
    );
  });

  it("deriva a solicitabilidade dos horarios contra o relogio informado", async () => {
    await seedDay(DATA_FUTURA, { "09:00": { liberado: true, agendamentoId: null } });

    const antes = new Date("2099-03-10T11:59:59.000Z");
    const depois = new Date("2099-03-10T12:00:00.000Z");

    expect(
      (await availabilityService.listDaySlots(DATA_FUTURA, antes))[0].statusVisual,
    ).toBe("disponivel");
    expect(
      (await availabilityService.listBookableSlots(DATA_FUTURA, antes)).map(
        (slot) => slot.horario,
      ),
    ).toEqual(["09:00"]);

    // Passado o instante do atendimento, o horário continua na agenda
    // administrativa (inativo) mas sai da vitrine pública.
    expect(
      (await availabilityService.listDaySlots(DATA_FUTURA, depois))[0].statusVisual,
    ).toBe("inativo");
    expect(await availabilityService.listBookableSlots(DATA_FUTURA, depois)).toEqual([]);
  });

  /**
   * Salvamento da agenda administrativa. É o outro caminho capaz de causar
   * overbooking: descartar o vínculo de um horário ocupado devolveria à vitrine
   * pública um horário com agendamento ativo em pé — o mesmo dano que CT-11/CT-12
   * evitam pelo lado da reserva.
   */
  describe("saveDayAvailability", () => {
    it("substitui a grade do dia pelos horarios informados", async () => {
      // Grade anterior com horário bloqueado: o salvamento substitui o dia,
      // então este horário precisa desaparecer do documento.
      await seedDay(DATA_FUTURA, { "07:00": { liberado: false, agendamentoId: null } });

      const salvos = await availabilityService.saveDayAvailability(DATA_FUTURA, [
        { horario: "08:00", liberado: true },
        { horario: "08:15", liberado: true },
      ]);

      expect(salvos).toEqual([
        {
          id: `${DATA_FUTURA}T08:00`,
          data: DATA_FUTURA,
          horario: "08:00",
          liberado: true,
          ocupado: false,
          statusVisual: "disponivel",
        },
        {
          id: `${DATA_FUTURA}T08:15`,
          data: DATA_FUTURA,
          horario: "08:15",
          liberado: true,
          ocupado: false,
          statusVisual: "disponivel",
        },
      ]);

      // Persistido, não só devolvido pelo service.
      expect(await readDaySlots(DATA_FUTURA)).toEqual({
        "08:00": { liberado: true, agendamentoId: null },
        "08:15": { liberado: true, agendamentoId: null },
      });
      expect(await availabilityService.listBookableSlots(DATA_FUTURA)).toHaveLength(2);
    });

    // Os dois payloads são as duas formas de perder o vínculo: bloquear o horário
    // ocupado ou simplesmente não mandá-lo (o salvamento substitui a grade).
    it.each([
      {
        caso: "bloqueando o horario ocupado",
        payload: [
          { horario: "10:00", liberado: false },
          { horario: "10:15", liberado: true },
        ],
      },
      {
        caso: "omitindo o horario ocupado do payload",
        payload: [{ horario: "10:15", liberado: true }],
      },
    ])(
      "recusa o salvamento $caso e preserva o agendamento do slot",
      async ({ payload }) => {
        await seedAppointment({ id: "ag-agenda-001", horario: "10:00" });
        await seedDay(DATA_FUTURA, {
          "10:00": { liberado: true, agendamentoId: "ag-agenda-001" },
          "10:15": { liberado: true, agendamentoId: null },
        });

        const erro = await capture(() =>
          availabilityService.saveDayAvailability(DATA_FUTURA, payload),
        );

        expect(erro).toBeInstanceOf(AppError);
        expect((erro as AppError).code).toBe("conflict");
        expect((erro as AppError).message).toBe(
          dominioTexts.horarioOcupadoNaoBloqueavel,
        );

        // A transação não comitou: o vínculo original segue no documento e o
        // horário continua fora da vitrine pública.
        expect(await readDaySlots(DATA_FUTURA)).toEqual({
          "10:00": { liberado: true, agendamentoId: "ag-agenda-001" },
          "10:15": { liberado: true, agendamentoId: null },
        });
        expect(
          (await availabilityService.listBookableSlots(DATA_FUTURA)).map(
            (slot) => slot.horario,
          ),
        ).toEqual(["10:15"]);
      },
    );

    it("recusa horario repetido no payload, mesmo em grafia diferente", async () => {
      const erro = await capture(() =>
        availabilityService.saveDayAvailability(DATA_FUTURA, [
          { horario: "09:00", liberado: true },
          // Mesmo horário depois da normalização (`9:00` → `09:00`): sem a guarda,
          // a segunda entrada sobrescreveria silenciosamente a primeira.
          { horario: "9:00", liberado: false },
        ]),
      );

      expect(erro).toBeInstanceOf(AppError);
      expect((erro as AppError).code).toBe("validation");
      expect((erro as AppError).message).toBe(dominioTexts.horarioRepetido);
      expect((erro as AppError).fieldErrors).toEqual({
        horarios: dominioTexts.horarioRepetido,
      });

      // Recusa antes de qualquer escrita: o dia segue sem agenda.
      expect(await availabilityService.listDaySlots(DATA_FUTURA)).toEqual([]);
    });

    it("recusa payload acima do teto de horarios da grade diaria", async () => {
      // 97 horários válidos e distintos — um acima do teto de 96 do repository.
      const excedente = Array.from({ length: 97 }, (_, indice) => ({
        horario: `${String(Math.floor(indice / 60)).padStart(2, "0")}:${String(
          indice % 60,
        ).padStart(2, "0")}`,
        liberado: true,
      }));

      const erro = await capture(() =>
        availabilityService.saveDayAvailability(DATA_FUTURA, excedente),
      );

      expect(erro).toBeInstanceOf(AppError);
      expect((erro as AppError).code).toBe("validation");
      expect((erro as AppError).message).toBe(dominioTexts.horariosDemais);
      expect(await availabilityService.listDaySlots(DATA_FUTURA)).toEqual([]);
    });
  });
});

/**
 * Solicitação pública — sem `profissional` no payload (PRD RN-10/RN-11): quem
 * solicita não escolhe o profissional, o service o resolve da configuração.
 */
function solicitar(cliente: string, telefone: string, horario: string) {
  return bookingService.requestAppointmentAtomically({
    cliente,
    telefone,
    data: DATA_FUTURA,
    horario,
  });
}

/**
 * Documento de agendamento como o repository o grava.
 *
 * Seed escreve pelo SDK admin (não pelo service): é assim que se monta o estado
 * de partida — inclusive o estado que o service NÃO produz, como um documento
 * corrompido ou um agendamento já cancelado.
 */
function appointmentDocument(
  seed: Omit<SeedAppointment, "id">,
): Record<string, unknown> {
  return {
    cliente: seed.cliente ?? "Cliente Seed",
    telefone: "11999998888",
    profissional: PROFISSIONAL,
    data: seed.data ?? DATA_FUTURA,
    horario: seed.horario ?? "09:00",
    status: seed.status ?? "aguardando_agendamento",
    adminConfirmadoEm: seed.adminConfirmadoEm ?? null,
    profissionalConfirmadoEm: seed.profissionalConfirmadoEm ?? null,
    canceladoEm: seed.canceladoEm ?? null,
  };
}

async function seedAppointment({ id, ...seed }: SeedAppointment): Promise<void> {
  await getFirestoreAdmin()
    .doc(firestorePaths.agendamento(id))
    .set(appointmentDocument(seed));
}

/** Documento `configuracoes/profissional` — fonte do profissional único (T6). */
async function seedProfessional(): Promise<void> {
  await getFirestoreAdmin()
    .doc(firestorePaths.configuracaoProfissional())
    .set({ nome: PROFISSIONAL, atualizadoEm: "2026-01-01T00:00:00.000Z" });
}

async function seedDay(
  isoDate: string,
  slots: Record<string, { liberado: boolean; agendamentoId: string | null }>,
): Promise<void> {
  await getFirestoreAdmin()
    .doc(firestorePaths.disponibilidadeDoDia(isoDate))
    .set({ data: isoDate, slots, atualizadoEm: "2026-01-01T00:00:00.000Z" });
}

async function readAppointmentDoc(
  agendamentoId: string,
): Promise<Record<string, unknown>> {
  const snapshot = await getFirestoreAdmin()
    .doc(firestorePaths.agendamento(agendamentoId))
    .get();

  return snapshot.data() ?? {};
}

/**
 * Mapa `slots` cru do documento do dia — para asserir a grade inteira (quais
 * horários existem e a quem pertencem), não só um vínculo.
 */
async function readDaySlots(
  isoDate: string,
): Promise<Record<string, { liberado: boolean; agendamentoId: string | null }>> {
  const snapshot = await getFirestoreAdmin()
    .doc(firestorePaths.disponibilidadeDoDia(isoDate))
    .get();

  return (snapshot.get("slots") ?? {}) as Record<
    string,
    { liberado: boolean; agendamentoId: string | null }
  >;
}

function isFulfilled<T>(
  resultado: PromiseSettledResult<T>,
): resultado is PromiseFulfilledResult<T> {
  return resultado.status === "fulfilled";
}

function isRejected<T>(
  resultado: PromiseSettledResult<T>,
): resultado is PromiseRejectedResult {
  return resultado.status === "rejected";
}
