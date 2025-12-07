// src/linera/lineraWallet.ts
//
// Централизованный backend Linera для покера,
// поверх @linera/wallet-sdk (твой кошелёк).

import type { Application, Client } from "@linera/client";
import { LINERA_APP_ID } from "./lineraEnv";

import {
  initWallet,
  getWalletInfo,
  type WalletInfo,
} from "@linera/wallet-sdk/src/api/wallet-api";

import { getLineraClient } from "@linera/wallet-sdk/src/network/linera-client";

export type BackendContext = {
  client: Client;
  application: Application;
  appId: string;
  chainId: string | null;
  wallet: {
    walletId: string | null;
    publicKeyBase58: string | null;
    createdAt: string | null;
  };
};

let backendPromise: Promise<BackendContext> | null = null;

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[lineraWallet]", ...args);
}

async function createBackend(): Promise<BackendContext> {
  log("Initializing Linera wallet backend…");

  try {
    // 1) Инициализируем кошелёк
    const initResult = await initWallet();
    log("initWallet result:", initResult);

    // 2) Получаем информацию о кошельке
    let walletInfo: WalletInfo | null = null;
    try {
      walletInfo = await getWalletInfo();
      log("Wallet info:", walletInfo);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[lineraWallet] getWalletInfo failed:", e);
    }

    // 3) Создаём Conway client
    const client: Client = await getLineraClient();

    // 4) Достаём frontend().application(...) без использования `any`
    type FrontendLike = {
      frontend(): {
        application(id: string): Application;
      };
    };

    const clientWithFrontend = client as unknown as FrontendLike;

    const application: Application = clientWithFrontend
      .frontend()
      .application(LINERA_APP_ID);

    const backend: BackendContext = {
      client,
      application,
      appId: LINERA_APP_ID,
      chainId: walletInfo ? walletInfo.chainId : null,
      wallet: {
        walletId: walletInfo ? walletInfo.walletId : null,
        publicKeyBase58: walletInfo ? walletInfo.publicKeyBase58 : null,
        createdAt: walletInfo ? walletInfo.createdAt : null,
      },
    };

    (window as unknown as { LINERA_BACKEND: BackendContext }).LINERA_BACKEND =
      backend;

    log("Backend ready:", {
      appId: backend.appId,
      chainId: backend.chainId,
      wallet: backend.wallet,
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

/**
 * Основной вход: лениво инициализирует backend один раз.
 */
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

/**
 * Если нужно просто дождаться готовности Linera.
 */
export function lineraReady(): Promise<BackendContext> {
  return getBackend();
}

/**
 * Упрощённый помощник, если нужен только Application.
 */
export async function getApplication(): Promise<Application> {
  const backend = await getBackend();
  return backend.application;
}
