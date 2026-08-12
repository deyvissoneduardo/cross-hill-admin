import { expect, type Page } from "@playwright/test";

import { E2E_EMULATED_SERVER } from "../../../playwright.config";

/**
 * Seed de E2E das telas administrativas: dados no Firestore emulado,
 * administrador no Auth emulado e **login real** pela tela de login.
 *
 * Duas regras governam este arquivo:
 *
 * 1. **Nenhum atalho de sessão.** A sessão administrativa nasce do caminho de
 *    produção: o teste preenche `/admin/login` e é o servidor que troca
 *    e-mail/senha por ID token no Identity Toolkit e assina o cookie com
 *    `createSessionCookie` (`src/features/admin/auth.ts`). O fixture só cria a
 *    conta no emulador — o mesmo passo que um operador faria fora da aplicação
 *    (PRD §9: o administrador da v1 é criado fora do produto). Não existe aqui
 *    (nem em produção) símbolo que fabrique sessão para teste.
 * 2. **Nenhum SDK e nenhuma variável de ambiente.** A escrita no Firestore e a
 *    criação da conta vão pela API HTTP dos próprios emuladores. Usar o Admin
 *    SDK exigiria `FIREBASE_AUTH_EMULATOR_HOST`/`FIRESTORE_EMULATOR_HOST` no
 *    `process.env` do runner — e o CT-21 assere justamente que o processo de
 *    teste está FORA do modo emulador, porque lá o emulador dispensaria a
 *    verificação de assinatura que aquele cenário existe para exercitar.
 *
 * Idempotente e seguro em paralelo: todos os documentos têm id fixo e conteúdo
 * fixo (inclusive `atualizadoEm`), então dois workers semeando ao mesmo tempo
 * escrevem exatamente os mesmos bytes. Por isso também não há limpeza global —
 * um `wipe` de um worker apagaria o seed do outro.
 */

/** Ids fixos dos agendamentos semeados — reexecutar sobrescreve, não acumula. */
export const SEED_APPOINTMENT_IDS = {
  aguardando: "e2e-agendamento-aguardando",
  confirmado: "e2e-agendamento-confirmado",
} as const;

/** Horários semeados na data da agenda. */
const SEED_HORARIOS = {
  ocupado: "09:00",
  confirmado: "10:00",
  disponivel: "11:00",
  bloqueado: "12:00",
} as const;

/**
 * Timestamp fixo de tudo que o seed grava.
 *
 * Fixo, e não `new Date()`, para que reescrever o mesmo documento produza bytes
 * idênticos — é o que permite ao CT-14 comparar a configuração do profissional
 * antes e depois das tentativas de mutação sem disputar com outro worker.
 */
const SEED_INSTANTE = "2026-01-01T12:00:00.000Z";

/** Cores da área do cliente — legíveis, para não plantar violação de contraste. */
const SEED_APARENCIA = {
  corPrimaria: "#ffffff",
  corSecundaria: "#1f2937",
  corDestaque: "#1d4ed8",
} as const;

const SEED_POS_AGENDAMENTO = {
  titulo: "Solicitação recebida",
  descricao: "Recebemos sua solicitação e confirmaremos o horário em breve.",
  dicas: ["Chegue com 10 minutos de antecedência."],
  avisos: ["Cancelamentos com menos de 2 horas não são reagendados."],
} as const;

/** Dados semeados que os specs precisam para navegar e asserir. */
export type AdminSeedData = {
  /** Data (`YYYY-MM-DD`) da agenda e dos agendamentos semeados. */
  dataAgenda: string;
  /** Nome do profissional único configurado. */
  profissional: string;
  horarios: typeof SEED_HORARIOS;
  aparencia: typeof SEED_APARENCIA;
  posAgendamento: typeof SEED_POS_AGENDAMENTO;
};

/**
 * Configuração compartilhada pelas verificações de acessibilidade (CT-22).
 *
 * Vive junto do seed porque as duas coisas descrevem o MESMO cenário: as telas
 * varridas dependem do que foi semeado, e separá-las faria a lista de telas
 * envelhecer sem o dado que a sustenta.
 */
export const a11yTestConfig = {
  /**
   * Impactos que reprovam o CT-22 (tech_spec §17.3: "sem violações
   * críticas/sérias"). `moderate`/`minor` continuam no relatório do axe.
   */
  impactosBloqueantes: ["critical", "serious"] as const,
  /** Conjunto de regras do padrão alvo WCAG 2.1 AA (tech_spec §13.1). */
  tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const,
  /** Mobile e desktop, os dois recortes exigidos pelo CT-22. */
  viewports: [
    { nome: "mobile", viewport: { width: 390, height: 844 } },
    { nome: "desktop", viewport: { width: 1280, height: 800 } },
  ] as const,
  /**
   * Alvo de toque mínimo, em px. É a altura que `design.md` §9 fixa para
   * botões, campos e links de navegação (`min-h-11` do Tailwind = 44px).
   */
  alvoDeToqueMinimoPx: 44,
  /** Espessura do contorno de foco de `app/globals.css` (`:focus-visible`). */
  contornoDeFocoEsperado: "2px",
} as const;

/**
 * Semeia o cenário administrativo e autentica `page` como administrador.
 *
 * Devolve os dados semeados para que o spec navegue e asserte sobre eles em vez
 * de repetir literais.
 */
export async function adminE2ESeed(page: Page): Promise<AdminSeedData> {
  const dataAgenda = isoDateEmDias(7);

  await seedFirestore(dataAgenda);
  await ensureAdminAccount();
  await signInAsAdmin(page);

  return {
    dataAgenda,
    profissional: E2E_EMULATED_SERVER.profissional,
    horarios: SEED_HORARIOS,
    aparencia: SEED_APARENCIA,
    posAgendamento: SEED_POS_AGENDAMENTO,
  };
}

/**
 * Lê o documento cru do profissional único no Firestore emulado.
 *
 * O CT-14 o usa para provar que as tentativas de CRUD não alteraram nada — a
 * ausência de rota não bastaria como prova se a configuração tivesse mudado por
 * outro caminho.
 */
export async function readProfessionalDocument(): Promise<unknown> {
  const response = await fetch(documentUrl("configuracoes/profissional"), {
    headers: emulatorHeaders(),
  });

  expect(
    response.ok,
    `Firestore emulado recusou a leitura do profissional (HTTP ${response.status})`,
  ).toBe(true);

  const documento = (await response.json()) as { fields?: unknown };
  return documento.fields;
}

/** Documentos do cenário administrativo (dashboard, agenda e configurações). */
async function seedFirestore(dataAgenda: string): Promise<void> {
  await Promise.all([
    // Profissional único (PRD RN-10): a v1 não tem CRUD, o documento é a fonte.
    writeDocument("configuracoes/profissional", {
      nome: E2E_EMULATED_SERVER.profissional,
      atualizadoEm: SEED_INSTANTE,
    }),
    writeDocument("configuracoes/aparencia", {
      ...SEED_APARENCIA,
      atualizadoEm: SEED_INSTANTE,
    }),
    writeDocument("configuracoes/pos-agendamento", {
      ...SEED_POS_AGENDAMENTO,
      dicas: [...SEED_POS_AGENDAMENTO.dicas],
      avisos: [...SEED_POS_AGENDAMENTO.avisos],
      atualizadoEm: SEED_INSTANTE,
    }),

    // Agendamento sem confirmação alguma: o card oferece Confirmar e Cancelar,
    // que são os controles cuja acessibilidade o CT-22 exercita (CA-03/CA-05).
    writeDocument(`agendamentos/${SEED_APPOINTMENT_IDS.aguardando}`, {
      cliente: "Marina Alves",
      telefone: "11987654321",
      profissional: E2E_EMULATED_SERVER.profissional,
      data: dataAgenda,
      horario: SEED_HORARIOS.ocupado,
      status: "aguardando_agendamento",
      adminConfirmadoEm: null,
      profissionalConfirmadoEm: null,
      canceladoEm: null,
    }),
    // Agendamento com as duas confirmações registradas: exercita a timeline de
    // confirmações e o rótulo de primeiro confirmador (CA-01).
    writeDocument(`agendamentos/${SEED_APPOINTMENT_IDS.confirmado}`, {
      cliente: "Bruno Carvalho",
      telefone: "11912345678",
      profissional: E2E_EMULATED_SERVER.profissional,
      data: dataAgenda,
      horario: SEED_HORARIOS.confirmado,
      status: "aguardando_agendamento",
      adminConfirmadoEm: "2026-01-02T10:00:00.000Z",
      profissionalConfirmadoEm: "2026-01-02T11:00:00.000Z",
      canceladoEm: null,
    }),

    // Agenda do dia com os quatro estados visuais possíveis de um slot:
    // ocupado, disponível e bloqueado — mais o vínculo real com o agendamento.
    writeDocument(`disponibilidade/${dataAgenda}`, {
      data: dataAgenda,
      slots: {
        [SEED_HORARIOS.ocupado]: {
          liberado: true,
          agendamentoId: SEED_APPOINTMENT_IDS.aguardando,
        },
        [SEED_HORARIOS.confirmado]: {
          liberado: true,
          agendamentoId: SEED_APPOINTMENT_IDS.confirmado,
        },
        [SEED_HORARIOS.disponivel]: { liberado: true, agendamentoId: null },
        [SEED_HORARIOS.bloqueado]: { liberado: false, agendamentoId: null },
      },
      atualizadoEm: SEED_INSTANTE,
    }),
  ]);
}

/**
 * Garante a conta do administrador no Auth emulado.
 *
 * Conta já existente não é erro: o seed roda uma vez por teste e a conta é a
 * mesma para todos. `EMAIL_EXISTS` é o resultado esperado a partir da segunda
 * chamada, e qualquer OUTRA falha precisa reprovar — engolir tudo esconderia
 * emulador fora do ar.
 */
async function ensureAdminAccount(): Promise<void> {
  const url = new URL(
    "/identitytoolkit.googleapis.com/v1/accounts:signUp",
    E2E_EMULATED_SERVER.authEmulatorOrigin,
  );
  url.searchParams.set("key", E2E_EMULATED_SERVER.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: E2E_EMULATED_SERVER.adminEmail,
      password: E2E_EMULATED_SERVER.adminPassword,
      returnSecureToken: true,
    }),
  });

  if (response.ok) {
    return;
  }

  const corpo = (await response.json()) as { error?: { message?: string } };
  expect(
    corpo.error?.message,
    `Auth emulado recusou criar o administrador (HTTP ${response.status})`,
  ).toBe("EMAIL_EXISTS");
}

/**
 * Autentica pelo formulário real de `/admin/login`.
 *
 * Toda a criptografia de sessão acontece do lado do servidor: o teste só digita
 * e-mail e senha. Chegar em `/admin` é a prova de que o cookie emitido foi
 * aceito pela verificação autoritativa (`assertAdminSession`).
 */
async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login");

  // Guarda de configuração: o seed só funciona contra o servidor emulado. No
  // servidor do CT-21 (sem emulador) o login falharia com uma mensagem genérica
  // e o motivo real ficaria escondido.
  expect(
    new URL(page.url()).origin,
    "use `test.use({ baseURL: E2E_EMULATED_SERVER.baseURL })` no spec: o seed exige o servidor com Firebase emulado",
  ).toBe(new URL(E2E_EMULATED_SERVER.baseURL).origin);

  await page.getByLabel("E-mail").fill(E2E_EMULATED_SERVER.adminEmail);
  await page.getByLabel("Senha").fill(E2E_EMULATED_SERVER.adminPassword);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL((url) => url.pathname !== "/admin/login", {
    timeout: 20_000,
  });

  const destino = new URL(page.url());
  expect(
    destino.pathname + destino.search,
    "login administrativo recusado — `erro=indisponivel` indica servidor sem NEXT_PUBLIC_FIREBASE_API_KEY ou sem emulador",
  ).toBe("/admin");
}

/** URL REST de um documento no Firestore emulado. */
function documentUrl(path: string): string {
  const { firestoreEmulatorOrigin, projectId } = E2E_EMULATED_SERVER;
  return `${firestoreEmulatorOrigin}/v1/projects/${projectId}/databases/(default)/documents/${path}`;
}

/** O emulador não valida o token, mas exige o cabeçalho de autorização. */
function emulatorHeaders(): Record<string, string> {
  return { Authorization: "Bearer owner", "Content-Type": "application/json" };
}

/** Grava o documento inteiro (PATCH sem `updateMask` sobrescreve os campos). */
async function writeDocument(path: string, dados: SeedMap): Promise<void> {
  const response = await fetch(documentUrl(path), {
    method: "PATCH",
    headers: emulatorHeaders(),
    body: JSON.stringify({ fields: toFirestoreFields(dados) }),
  });

  expect(
    response.ok,
    `Firestore emulado recusou a escrita em ${path} (HTTP ${response.status})`,
  ).toBe(true);
}

type SeedValue = string | boolean | null | readonly SeedValue[] | SeedMap;
type SeedMap = { readonly [campo: string]: SeedValue };

function toFirestoreFields(dados: SeedMap): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dados).map(([campo, valor]) => [campo, toFirestoreValue(valor)]),
  );
}

/** Converte um valor do seed no `Value` tipado que a API REST do Firestore usa. */
function toFirestoreValue(valor: SeedValue): Record<string, unknown> {
  if (valor === null) {
    return { nullValue: null };
  }

  if (typeof valor === "string") {
    return { stringValue: valor };
  }

  if (typeof valor === "boolean") {
    return { booleanValue: valor };
  }

  if (Array.isArray(valor)) {
    return { arrayValue: { values: valor.map(toFirestoreValue) } };
  }

  return { mapValue: { fields: toFirestoreFields(valor as SeedMap) } };
}

/**
 * Data `YYYY-MM-DD` a `dias` de hoje.
 *
 * A agenda semeada precisa estar no futuro em qualquer fuso: um slot cujo
 * instante já passou vira `inativo` e o agendamento sairia de "aguardando
 * agendamento" (`deriveSlotStatus`/`deriveAppointmentStatus`). Com uma semana de
 * folga, a diferença de fuso entre runner e servidor é irrelevante.
 */
function isoDateEmDias(dias: number): string {
  const alvo = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return alvo.toISOString().slice(0, 10);
}
