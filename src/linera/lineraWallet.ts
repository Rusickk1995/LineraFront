// src/linera/lineraWallet.ts
//
// Адаптер между @linera/wallet-sdk и твоим Poker-приложением:
//  - поднятие Linera Client (getLineraClient)
//  - создание Application по LINERA_APP_ID
//  - единый BackendContext + кеш в window.*.

import type { Application, Client } from "@linera/client";
import { LINERA_APP_ID } from "./lineraEnv";

import { getLineraClient } from "@linera/wallet-sdk";

// ----------------------------------------------------------------------------
// Типы backend-контекста
// ----------------------------------------------------------------------------

export type BackendContext = {
  client: Client;
  application: Application;
  appId: string;
  // Транспорт GraphQL: принимает JSON-строку, возвращает JSON-строку.
  query(body: string): Promise<string>;
};

let backendPromise: Promise<BackendContext> | null = null;

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[lineraWallet]", ...args);
}

// ----------------------------------------------------------------------------
// Типы для разных вариантов API клиента (@linera/client может отличаться).
// ----------------------------------------------------------------------------

type FrontendLike = {
  frontend(): {
    application(id: string): Application | Promise<Application>;
  };
};

type DirectApplicationClient = Client & {
  application(id: string): Application | Promise<Application>;
};

type ApplicationWithQuery = Application & {
  query(body: string): string | Promise<string>;
};


function hasFrontend(client: Client): client is Client & FrontendLike {
  const candidate = client as unknown as { frontend?: unknown };
  return typeof candidate.frontend === "function";
}

function hasDirectApplication(client: Client): client is DirectApplicationClient {
  const candidate = client as unknown as { application?: unknown };
  return typeof candidate.application === "function";
}

function hasApplicationQuery(app: Application): app is ApplicationWithQuery {
  const candidate = app as unknown as { query?: unknown };
  return typeof candidate.query === "function";
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  if (value === null) return false;
  const t = typeof value;
  if (t !== "object" && t !== "function") return false;

  const maybeThen = (value as { then?: unknown }).then;
  return typeof maybeThen === "function";
}

// ----------------------------------------------------------------------------
// Расширенный window для отладки
// ----------------------------------------------------------------------------

interface LineraDebugWindow extends Window {
  LINERA_BACKEND?: BackendContext;
  LINERA_BACKEND_ERROR?: unknown;
}

function getDebugWindow(): LineraDebugWindow | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as LineraDebugWindow;
}

// ----------------------------------------------------------------------------
// Helper withTimeout
// ----------------------------------------------------------------------------

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
    const result = await Promise.race<[T, never] | T>([
      promise,
      timeoutPromise as unknown as Promise<T>,
    ]);
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

// ----------------------------------------------------------------------------
// Создание backend-контекста
// ----------------------------------------------------------------------------

async function createBackend(): Promise<BackendContext> {
  log("Initializing Linera wallet backend…");

  try {
    // 1) Получаем Conway client из @linera/wallet-sdk.
    log("Calling getLineraClient()…");

    const client: Client = await withTimeout(
      getLineraClient().then(
        (c: Client) => {
          log("[DEBUG] getLineraClient RESOLVED");
          return c;
        },
        (e: unknown) => {
          // eslint-disable-next-line no-console
          console.error("[DEBUG] getLineraClient REJECTED:", e);
          throw e;
        }
      ),
      "getLineraClient()"
    );

    log("getLineraClient returned control");

    // 2) Application по APP_ID. Поддерживаем оба варианта API:
    //    - client.frontend().application(APP_ID)
    //    - client.application(APP_ID)
    let application: Application;

    if (hasFrontend(client)) {
      log(
        "Creating Application via client.frontend().application for APP_ID =",
        LINERA_APP_ID
      );
      const maybeApplication = client.frontend().application(LINERA_APP_ID);
      application = isPromiseLike<Application>(maybeApplication)
        ? await maybeApplication
        : maybeApplication;
    } else if (hasDirectApplication(client)) {
      log(
        "Creating Application via client.application for APP_ID =",
        LINERA_APP_ID
      );
      const maybeApplication = client.application(LINERA_APP_ID);
      application = isPromiseLike<Application>(maybeApplication)
        ? await maybeApplication
        : maybeApplication;
    } else {
      throw new Error(
        "[lineraWallet] Neither client.frontend().application nor client.application is available on Client"
      );
    }

    // 3) Строим функцию query(body: string) поверх application.query(body).
    if (!hasApplicationQuery(application)) {
      throw new Error(
        "[lineraWallet] Application object does not expose query(body: string) method required for GraphQL transport"
      );
    }

    const query = async (body: string): Promise<string> => {
      const result = application.query(body);
      return isPromiseLike<string>(result) ? await result : result;
    };

    const backend: BackendContext = {
      client,
      application,
      appId: LINERA_APP_ID,
      query,
    };

    const debugWindow = getDebugWindow();
    if (debugWindow) {
      debugWindow.LINERA_BACKEND = backend;
    }

    log("Backend ready:", {
      appId: backend.appId,
    });

    return backend;
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error("[lineraWallet] FATAL error in createBackend:", e);

    const debugWindow = getDebugWindow();
    if (debugWindow) {
      debugWindow.LINERA_BACKEND_ERROR = e;
    }

    // Сброс делаем в getBackend(), чтобы можно было повторить попытку.
    throw e;
  }
}

// ----------------------------------------------------------------------------
// Публичный API
// ----------------------------------------------------------------------------

export async function getBackend(): Promise<BackendContext> {
  if (!backendPromise) {
    log("getBackend(): starting new backend init");
    backendPromise = createBackend().catch((e: unknown) => {
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
