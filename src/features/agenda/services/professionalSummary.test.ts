// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// A leitura real da configuração (documento `configuracoes/profissional`,
// semeadura pela variável de ambiente, aparo do nome) é exercitada contra o
// Firestore Emulator em `tests/integration/settingsService.test.ts`. Aqui o
// dublê é do **service** da feature dona (`configuracoes`) — a fronteira que
// este módulo realmente atravessa — apenas para produzir o que o emulador não
// produz sob demanda: uma FALHA de leitura, que é exatamente o comportamento
// que este módulo acrescenta (degradar para `null` em vez de derrubar a Agenda
// administrativa).
vi.mock("@/src/features/configuracoes/services/settingsService", () => ({
  settingsService: { getConfiguredProfessional: vi.fn() },
}));

import { readConfiguredProfessionalName } from "@/src/features/agenda/services/professionalSummary";
import { settingsService } from "@/src/features/configuracoes/services/settingsService";

/**
 * Leitura do profissional único para a Agenda administrativa (PRD US-07).
 *
 * INVARIANT: a Agenda nunca quebra por causa deste bloco informativo — sem
 * configuração ou com falha de leitura, o resultado é "não configurado"
 * (`null`), nunca uma exceção que derrube a página nem uma string vazia exibida
 * na tela.
 * OWNING_LAYER: `unit` — o módulo só delega ao service de `configuracoes` e
 * decide o que fazer com a falha.
 * REAL EXECUTION BOUNDARY: `db` no companheiro de integração citado acima.
 */

const readProfessionalName = vi.mocked(settingsService.getConfiguredProfessional);

afterEach(() => {
  vi.restoreAllMocks();
  readProfessionalName.mockReset();
});

describe("readConfiguredProfessionalName", () => {
  it("devolve null e registra o motivo quando a leitura da configuração falha", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    readProfessionalName.mockRejectedValue(new TypeError("Firestore indisponível"));

    await expect(readConfiguredProfessionalName()).resolves.toBeNull();

    // Log é evento, não dump: só o tipo da falha, sem a configuração.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[agenda] profissional não pôde ser lido", {
      tipo: "TypeError",
    });
  });

  it("devolve null quando não há profissional configurado", async () => {
    readProfessionalName.mockResolvedValue(null);

    await expect(readConfiguredProfessionalName()).resolves.toBeNull();
  });

  it("-> (negative companion) entrega o nome configurado sem transformá-lo", async () => {
    readProfessionalName.mockResolvedValue("Ana Souza");

    await expect(readConfiguredProfessionalName()).resolves.toBe("Ana Souza");

    // A leitura é uma só, sem argumento: normalização e semeadura são da feature
    // `configuracoes` — este módulo não repete nem parametriza nenhuma das duas.
    expect(readProfessionalName).toHaveBeenCalledTimes(1);
    expect(readProfessionalName).toHaveBeenCalledWith();
  });
});
