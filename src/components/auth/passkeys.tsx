"use client";

import { FaceIdIcon, FingerPrintIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { unstable_rethrow, useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { logout } from "@/actions/auth";
import {
  deletePasskey,
  getPasskeyLoginOptions,
  getPasskeyRegistrationOptions,
  getUnlockOptions,
  loginWithPasskey,
  pingSession,
  registerPasskey,
  type UnlockFormState,
  unlockWithPasskey,
  unlockWithPassword,
} from "@/actions/passkeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOCK_AFTER_MS, PING_EVERY_MS } from "@/lib/auth/app-lock";

type Platform = "ios" | "mac" | "android" | "windows" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/u.test(ua)) return "ios";
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/Macintosh/u.test(ua)) {
    return navigator.maxTouchPoints > 1 ? "ios" : "mac";
  }
  if (/Android/u.test(ua)) return "android";
  if (/Windows/u.test(ua)) return "windows";
  return "other";
}

const labels: Record<Platform, string> = {
  ios: "Face ID",
  mac: "Touch ID",
  android: "biometria",
  windows: "Windows Hello",
  other: "chave de acesso",
};

const subscribeNever = () => () => {};

/** What the user will see the system ask for: "Face ID", "biometria"… */
export function usePasskeyLabel() {
  const platform = useSyncExternalStore(
    subscribeNever,
    detectPlatform,
    (): Platform => "other",
  );

  return {
    label: labels[platform],
    icon: platform === "ios" ? FaceIdIcon : FingerPrintIcon,
  };
}

function useWebAuthnSupport() {
  return useSyncExternalStore(
    subscribeNever,
    browserSupportsWebAuthn,
    () => false,
  );
}

type Ceremony<T> =
  | { value: T; error?: undefined }
  | { value?: undefined; error?: Error };

/**
 * Runs the system's Face ID / biometrics sheet. Cancelling it (or iOS
 * refusing to open it without a tap) yields neither a value nor an error.
 */
async function runCeremony<T>(
  ceremony: () => Promise<T>,
): Promise<Ceremony<T>> {
  try {
    return { value: await ceremony() };
  } catch (caught) {
    // Fetching the options may redirect (e.g. the session ended meanwhile).
    unstable_rethrow(caught);
    const error = caught instanceof Error ? caught : new Error(String(caught));
    if (error.name === "NotAllowedError" || error.name === "AbortError") {
      return {};
    }
    return { error };
  }
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p role="alert" className="text-sm text-destructive-foreground">
      {message}
    </p>
  );
}

function Divider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function PasskeyLoginButton() {
  const supported = useWebAuthnSupport();
  const { label, icon } = usePasskeyLabel();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!supported) return null;

  function signIn() {
    setError(null);
    startTransition(async () => {
      const response = await runCeremony(async () =>
        startAuthentication({ optionsJSON: await getPasskeyLoginOptions() }),
      );
      if (response.error) {
        setError("Não foi possível entrar com a chave de acesso.");
        return;
      }
      if (!response.value) return;

      // Outside any try/catch: on success the action redirects, and Next.js
      // carries that out by rejecting this call.
      const result = await loginWithPasskey(response.value);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="mb-4 space-y-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={signIn}
        className="h-11 w-full md:h-10"
      >
        <HugeiconsIcon icon={icon} strokeWidth={1.8} />
        {pending ? "Aguardando confirmação…" : `Entrar com ${label}`}
      </Button>
      <ErrorText message={error} />
      <Divider>ou com e-mail e senha</Divider>
    </div>
  );
}

const idleUnlock: UnlockFormState = { status: "idle" };

export function UnlockPanel({ next }: { next: string }) {
  const supported = useWebAuthnSupport();
  const { label, icon } = usePasskeyLabel();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    unlockWithPassword,
    idleUnlock,
  );
  const autoStarted = useRef(false);

  function unlock() {
    setError(null);
    startTransition(async () => {
      const response = await runCeremony(async () =>
        startAuthentication({ optionsJSON: await getUnlockOptions() }),
      );
      if (response.error) {
        setError(`Não foi possível desbloquear com ${label}.`);
        return;
      }
      if (!response.value) return;

      const result = await unlockWithPasskey(response.value, next);
      if (!result.ok) setError(result.message);
    });
  }

  // Android opens the prompt right away. iOS insists on a tap first and
  // refuses this call quietly, which leaves the button below for it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on arrival
  useEffect(() => {
    if (!supported || autoStarted.current) return;
    autoStarted.current = true;
    unlock();
  }, [supported]);

  return (
    <div className="space-y-4">
      {supported ? (
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={unlock}
          className="h-11 w-full md:h-10"
        >
          <HugeiconsIcon icon={icon} strokeWidth={1.8} />
          {pending ? "Aguardando confirmação…" : `Desbloquear com ${label}`}
        </Button>
      ) : null}
      <ErrorText message={error} />

      {showPassword || !supported ? (
        <form action={passwordAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <label
            htmlFor="unlock-password"
            className="block text-sm font-medium"
          >
            Senha
          </label>
          <Input
            id="unlock-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="h-11 md:h-10"
          />
          <ErrorText message={passwordState.message ?? null} />
          <Button
            type="submit"
            variant={supported ? "outline" : "default"}
            size="lg"
            disabled={passwordPending}
            className="h-11 w-full md:h-10"
          >
            {passwordPending ? "Conferindo…" : "Desbloquear com a senha"}
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="w-full cursor-pointer py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Usar a senha
        </button>
      )}

      <button
        type="button"
        onClick={() => startTransition(() => logout())}
        className="w-full cursor-pointer py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Sair da conta
      </button>
    </div>
  );
}

export function AddPasskeyButton({ hasPasskeys }: { hasPasskeys: boolean }) {
  const supported = useWebAuthnSupport();
  const { label, icon } = usePasskeyLabel();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador não oferece chaves de acesso.
      </p>
    );
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const response = await runCeremony(async () =>
        startRegistration({
          optionsJSON: await getPasskeyRegistrationOptions(),
        }),
      );
      if (response.error) {
        setError(
          response.error.name === "InvalidStateError"
            ? "Este aparelho já tem uma chave de acesso cadastrada."
            : "Não foi possível cadastrar a chave de acesso.",
        );
        return;
      }
      if (!response.value) return;

      const result = await registerPasskey(response.value);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button type="button" disabled={pending} onClick={add}>
        <HugeiconsIcon icon={icon} strokeWidth={1.8} />
        {pending
          ? "Aguardando confirmação…"
          : hasPasskeys
            ? "Adicionar este aparelho"
            : `Ativar ${label}`}
      </Button>
      <ErrorText message={error} />
    </div>
  );
}

export function DeletePasskeyButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        Remover
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => deletePasskey(id))}
      >
        {pending ? "Removendo…" : "Remover"}
      </Button>
    </div>
  );
}

/**
 * The app lock's client half. While the app is visible it tells the server
 * it is in use; after LOCK_AFTER_MS in the background it covers the screen
 * until the server answers, then sends a locked session to /unlock.
 */
export function AppLockWatcher() {
  const router = useRouter();
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    let hiddenAt: number | null = null;
    let active = true;

    async function check() {
      let status: Awaited<ReturnType<typeof pingSession>>;
      try {
        status = await pingSession();
      } catch {
        // Offline: the server enforces the lock on the next request anyway.
        setCovered(false);
        return;
      }
      if (!active) return;

      if (status === "locked") {
        const here = `${window.location.pathname}${window.location.search}`;
        router.replace(`/unlock?next=${encodeURIComponent(here)}`);
      } else if (status === "signed-out") {
        router.replace("/login");
      } else {
        setCovered(false);
      }
    }

    function startPinging() {
      window.clearInterval(timer);
      timer = window.setInterval(check, PING_EVERY_MS);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now();
        window.clearInterval(timer);
        return;
      }

      if (hiddenAt !== null && Date.now() - hiddenAt >= LOCK_AFTER_MS) {
        setCovered(true);
      }
      hiddenAt = null;
      void check();
      startPinging();
    }

    if (!document.hidden) startPinging();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  if (!covered) return null;

  return (
    <div aria-hidden="true" className="fixed inset-0 z-[100] bg-background" />
  );
}
