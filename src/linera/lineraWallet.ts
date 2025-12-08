// src/linera/lineraWallet.ts

import type { Application, Client } from "@linera/client";
import { LINERA_APP_ID } from "./lineraEnv";

import {
  initWallet,
  getLineraClient,
  type WalletInitResult,
} from "@linera/wallet-sdk";

export type BackendContext = {
  client: Client;
  application: Application;
  appId: string;
};

let backendPromise: Promise<BackendContext> | null = null;

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[lineraWallet]", ...args);
}

type FrontendLike = {
  frontend(): {
    application(id: string): Application;
  };
};

// Небольшой helper, чтобы не висеть бесконечно в случае зависания промиса.
async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  ms = 15000
): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Timeout in ${label} after ${ms} ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return result as T;
  } catch (e) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    throw e;
  }
}

async function createBackend(): Promise<BackendContext> {
  log("Initializing Linera wallet backend…");

  try {
    // 1) Полная инициализация кошелька (локальный ключ + Conway client)
    const initResult: WalletInitResult = await withTimeout(
      initWallet(),
      "initWallet()"
    );

    log("initWallet completed:", initResult);

    if (!initResult.ok) {
      const msg =
        initResult.message ||
        "initWallet() returned ok=false; cannot continue backend init";
      throw new Error(msg);
    }

    // 2) Conway client (дублируем вызов на всякий случай, но он кешируется)
    const client: Client = await withTimeout(
      getLineraClient(),
      "getLineraClient()"
    );
    log("getLineraClient completed");

    const clientWithFrontend = client as unknown as FrontendLike;

    // 3) Application по APP_ID
    log("Creating Application frontend for APP_ID =", LINERA_APP_ID);
    const application = clientWithFrontend.frontend().application(LINERA_APP_ID);

    const backend: BackendContext = {
      client,
      application,
      appId: LINERA_APP_ID,
    };

    (window as any).LINERA_BACKEND = backend;

    log("Backend ready:", {
      appId: backend.appId,
    });

    return backend;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[lineraWallet] FATAL error in createBackend:", e);
    (window as any).LINERA_BACKEND_ERROR = e;
    throw e;
  }
}

export async function getBackend(): Promise<BackendContext> {
  if (!backendPromise) {
    log("getBackend(): starting new backend init");
    backendPromise = createBackend().catch((e) => {
      // eslint-disable-next-line no-console
      console.error("[lineraWallet] Backend init failed:", e);
      backendPromise = null; // позволяем повторную попытку
      throw e;
    });
  } else {
    log("getBackend(): reusing existing backendPromise");
  }
  return backendPromise;
}

export function lineraReady(): Promise<BackendContext> {
  return getBackend();
}

export async function getApplication(): Promise<Application> {
  const backend = await getBackend();
  return backend.application;
}
