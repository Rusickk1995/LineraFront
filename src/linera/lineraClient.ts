// src/linera/lineraClient.ts
import * as linera from "@linera/client";

const FAUCET_URL =
  import.meta.env.VITE_LINERA_FAUCET_URL ??
  "https://faucet.testnet-conway.linera.net";

const APP_ID = import.meta.env.VITE_LINERA_APP_ID as string | undefined;

export type Backend = {
  query(request: string): Promise<string>;
};

type GraphQLError = { message: string };
type GraphQLResponse<TData> = { data?: TData; errors?: GraphQLError[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Backend returned invalid JSON");
  }
}

/** --- 0) wasm init (в 0.15.7 нет default(), есть initialize()) --- */
let wasmInitPromise: Promise<void> | null = null;

async function ensureLineraWasm(): Promise<void> {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const anyLinera = linera as unknown as Record<string, unknown>;

      const init = anyLinera["initialize"];
      const def = anyLinera["default"];

      if (typeof init === "function") {
        await (init as () => Promise<void>)();
        return;
      }

      // на всякий случай (в твоём runtime default=undefined)
      if (typeof def === "function") {
        await (def as () => Promise<void>)();
        return;
      }

      throw new Error(
        "Linera WASM init entrypoint not found. Expected initialize() (0.15.7)."
      );
    })();
  }
  await wasmInitPromise;
}

/** --- 1) Owner: берём из signer (а не из wallet) --- */
async function resolveOwnerFromSigner(signer: unknown): Promise<string> {
  const s = signer as Record<string, unknown>;
  const candidates = ["address", "owner", "publicKey"];

  for (const name of candidates) {
    const fn = s[name];
    if (typeof fn === "function") {
      const out = await (fn as () => Promise<unknown> | unknown)();
      if (typeof out === "string" && out.length > 0) return out;
    }
  }

  // это не “угадывание”, это стоп с конкретным диагнозом
  throw new Error(
    "Cannot resolve owner string from PrivateKeySigner. " +
      "Run: node -e \"import('@linera/client').then(({PrivateKeySigner})=>console.log(Object.getOwnPropertyNames(PrivateKeySigner.prototype)))\""
  );
}

type Session = {
  faucet: linera.Faucet;
  wallet: linera.Wallet;
  signer: linera.PrivateKeySigner;
  owner: string;
  chainId: string;
  client: linera.Client;
};

let sessionPromise: Promise<Session> | null = null;
let backendPromise: Promise<Backend> | null = null;

/** --- 2) Client: создаём wallet + signer + claimChain(wallet, owner) --- */
async function getSession(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      await ensureLineraWasm();

      const faucet = new linera.Faucet(FAUCET_URL);
      const wallet = await faucet.createWallet();

      // В 0.15.7 это экспортируется (ты видел в Object.keys)
      const signer = new linera.PrivateKeySigner();
      const owner = await resolveOwnerFromSigner(signer);

      // В runtime 0.15.7 claimChain(wallet, owner) — ты это подтвердил Node выводом
      const chainId = await faucet.claimChain(wallet, owner);

      const client = new linera.Client(wallet, signer);

      console.info("[Linera] owner:", owner);
      console.info("[Linera] chain:", chainId);

      return { faucet, wallet, signer, owner, chainId, client };
    })();
  }
  return sessionPromise;
}

export async function getClient(): Promise<linera.Client> {
  const s = await getSession();
  return s.client;
}

export async function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (!APP_ID) throw new Error("VITE_LINERA_APP_ID is missing (.env / Vercel env).");

      const client = await getClient();
      const app = await client.frontend().application(APP_ID);

      const maybe = app as unknown;
      if (!isRecord(maybe) || typeof (maybe as { query?: unknown }).query !== "function") {
        throw new Error("Backend does not expose query(request: string): Promise<string>");
      }
      return maybe as Backend;
    })();
  }
  return backendPromise;
}

export async function gql<TData>(
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string
): Promise<TData> {
  const backend = await getBackend();
  const request = JSON.stringify({ query, variables, operationName });

  const raw = await backend.query(request);
  const parsed = parseJson(raw);

  if (!isRecord(parsed)) throw new Error("Unexpected GraphQL response shape");

  const errors = parsed.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const msg = errors
      .map((e) => (isRecord(e) && typeof e.message === "string" ? e.message : "Unknown error"))
      .join("; ");
    throw new Error(msg);
  }

  const data = (parsed as GraphQLResponse<TData>).data;
  if (data === undefined) throw new Error("GraphQL response has no data");
  return data;
}

export async function listGraphQLOperations(): Promise<{
  queries: string[];
  mutations: string[];
}> {
  const q = `
    query {
      __schema {
        queryType { fields { name } }
        mutationType { fields { name } }
      }
    }
  `;

  const data = await gql<{
    __schema: {
      queryType: { fields: { name: string }[] } | null;
      mutationType: { fields: { name: string }[] } | null;
    };
  }>(q);

  return {
    queries: (data.__schema.queryType?.fields ?? []).map((f) => f.name),
    mutations: (data.__schema.mutationType?.fields ?? []).map((f) => f.name),
  };
}

/** --- 3) Debug: чтобы ты тестировал в браузере, а не в bash --- */
declare global {
  interface Window {
    lineraDebug?: {
      getClient: typeof getClient;
      getBackend: typeof getBackend;
      gql: typeof gql;
      listGraphQLOperations: typeof listGraphQLOperations;
    };
  }
}
window.lineraDebug = { getClient, getBackend, gql, listGraphQLOperations };

/** ВАЖНО: это лечит твою ошибку build: страницы импортируют fetchTournaments из lineraClient.ts */
export * from "./pokerApi";
