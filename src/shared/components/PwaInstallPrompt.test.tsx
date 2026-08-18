import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PwaInstallPrompt } from "./PwaInstallPrompt";

function setMobileBrowser(matches = true) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(pointer: coarse)" ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("PwaInstallPrompt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("oferece a instalação nativa em navegadores mobile compatíveis", async () => {
    setMobileBrowser();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    render(<PwaInstallPrompt />);

    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt, userChoice });
    window.dispatchEvent(event);

    fireEvent.click(await screen.findByRole("button", { name: "Instalar aplicativo" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });

  it("não mostra convite em dispositivos desktop", () => {
    setMobileBrowser(false);
    render(<PwaInstallPrompt />);

    window.dispatchEvent(new Event("beforeinstallprompt", { cancelable: true }));

    expect(screen.queryByRole("complementary", { name: "Instalar aplicativo" })).toBeNull();
  });
});
