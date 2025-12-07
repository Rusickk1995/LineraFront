// src/linera/lineraWallet.ts

import type { Application, Client } from "@linera/client";
import { LINERA_APP_ID } from "./lineraEnv";

import { initWallet } from "@linera/wallet-sdk/src/api/wallet-api";
import { getLineraClient } from "@linera/wallet-sdk/src/network/linera-client";

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

async function createBackend(): Promise<BackendContext> {
  log("Initializing Linera wallet backend…");

  try {
    // 1) Инициализация кошелька (локальный ключ + Conway-мета)
    await initWallet();
    log("initWallet completed");

    // 2) Conway client
    const client: Client = await getLineraClient();
    log("getLineraClient completed");

    const clientWithFrontend = client as unknown as FrontendLike;

    // 3) Application по APP_ID
    const application = clientWithFrontend.frontend().application(LINERA_APP_ID);

    const backend: BackendContext = {
      client,
      application,
      appId: LINERA_APP_ID,
    };

    (window as unknown as { LINERA_BACKEND: BackendContext }).LINERA_BACKEND =
      backend;

    log("Backend ready:", {
      appId: backend.appId,
    });

    return backend;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[lineraWallet] FATAL error in createBackend:", e);
    (window as unknown as { LINERA_BACKEND_ERROR: unknown }).LINERA_BACKEND_ERROR =
      e;
    throw e;
  }
}

export async function getBackend(): Promise<BackendContext> {
  if (!backendPromise) {
    backendPromise = createBackend().catch((e) => {
      // eslint-disable-next-line no-console
      console.error("[lineraWallet] Backend init failed:", e);
      backendPromise = null;
      throw e;
    });
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
