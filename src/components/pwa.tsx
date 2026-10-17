"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Registers /sw.js in production builds (dev keeps HMR cache-free). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Without a service worker the app still works, just not offline.
      });
  }, []);

  return null;
}

export function ReloadButton() {
  return (
    <Button size="lg" className="mt-7" onClick={() => window.location.reload()}>
      Tentar de novo
    </Button>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState =
  | { kind: "unavailable" }
  | { kind: "prompt"; install: () => Promise<void> }
  | { kind: "ios" };

/**
 * What "install the app" means on this device: Chrome/Edge/Android hand us a
 * prompt, iOS Safari needs the Share → Add to Home Screen steps, and an
 * already-installed app needs nothing.
 */
export function useInstallState(): InstallState {
  const [state, setState] = useState<InstallState>({ kind: "unavailable" });

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) return;

    const isIos =
      /iphone|ipad|ipod/iu.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos) {
      setState({ kind: "ios" });
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      const deferred = event as BeforeInstallPromptEvent;
      setState({
        kind: "prompt",
        install: async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setState({ kind: "unavailable" });
        },
      });
    };
    const onInstalled = () => setState({ kind: "unavailable" });

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return state;
}
