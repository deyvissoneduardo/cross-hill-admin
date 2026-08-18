"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { Button } from "@/src/shared/components/Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isMobileDevice() {
  return isIOSDevice() || window.matchMedia("(pointer: coarse)").matches;
}

function isRunningStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMobileDevice() || isRunningStandalone()) {
      return;
    }

    const iosDetection = window.setTimeout(() => {
      setShowIOSInstructions(isIOSDevice());
    }, 0);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIOSInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(iosDetection);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;

    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (dismissed || (!installEvent && !showIOSInstructions)) {
    return null;
  }

  return (
    <aside
      aria-label="Instalar aplicativo"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-(--color-border-strong) bg-(--color-surface-2) p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-(--color-foreground)">Instale o Crosshill</h2>
          <p className="mt-1 text-sm leading-5 text-(--color-muted)">
            {showIOSInstructions
              ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
              : "Acesse o painel mais rápido pela tela inicial do seu celular."}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar convite de instalação"
          onClick={() => setDismissed(true)}
          className="min-h-11 min-w-11 rounded-lg text-xl leading-none text-(--color-muted) hover:bg-(--color-surface-3) hover:text-(--color-foreground)"
        >
          ×
        </button>
      </div>

      {installEvent ? (
        <div className="mt-3">
          <Button type="button" fullWidth onClick={install}>
            Instalar aplicativo
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
