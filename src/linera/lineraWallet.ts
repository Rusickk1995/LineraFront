// src/linera/lineraWallet.ts

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
    walletId: string;
    publicKeyBase58: string;
    createdAt: string;
  };
};

let backendPromise: Promise<BackendContext> | null = null;

function log(...args: unknown[]) {
  console.log("[lineraWallet]", ...args);
}

async function createBackend(): Promise<BackendContext> {
  log("Initializing Linera wallet backend…");

  try {
    // 1) Инициализация кошелька (ED25519 + Conway)
    const initResult = await initWallet();
    if (!initResult.ok) {
      throw new Error(
        `[lineraWallet] initWallet failed: ${initResult.message}`
      );
    }

    // 2) Информация о кошельке
    const info: WalletInfo = await getWalletInfo();
    log("Wallet info:", info);

    // 3) Linera Client поверх Faucet-кошелька Conway
    const client: Client = await getLineraClient();
    const anyClient: any = client as any;

    // 4) Application для покера по APP_ID
    const application: Application = anyClient
      .frontend()
      .application(LINERA_APP_ID) as Application;

    const backend: BackendContext = {
      client,
      application,
      appId: LINERA_APP_ID,
      chainId: info.chainId,
      wallet: {
        walletId: info.walletId,
        publicKeyBase58: info.publicKeyBase58,
        createdAt: info.createdAt,
      },
    };

    // Для дебага из консоли
    (window as any).LINERA_BACKEND = backend;

    log("Backend ready:", {
      appId: backend.appId,
      chainId: backend.chainId,
      wallet: backend.wallet,
    });

    return backend;
  } catch (e) {
    console.error("[lineraWallet] FATAL error in createBackend:", e);
    (window as any).LINERA_BACKEND_ERROR = e;
    throw e;
  }
}

/**
 * Основной вход: лениво инициализирует backend один раз.
 */
export async function getBackend(): Promise<BackendContext> {
  if (!backendPromise) {
    backendPromise = createBackend().catch((e) => {
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
