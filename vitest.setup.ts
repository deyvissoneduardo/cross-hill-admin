import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { beforeEach } from "vitest";

// Limpeza ANTES de cada teste: robusto a crash do teste anterior
// (evita herdar DOM sujo — ver antipadrão `cleanup_in_afterEach`).
beforeEach(() => {
  cleanup();
});
