// src/linera/lineraClient.ts
import * as linera from "@linera/client";

const FAUCET_URL =
  import.meta.env.VITE_LINERA_FAUCET_URL ??
  "https://faucet.testnet-conway.linera.net";

const APP_ID = import.meta.env.VITE_LINERA_APP_ID as string | undefined;

/** Минимальный контракт backend, который нам нужен */
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

/**
 * В @linera/client@0.15.7 для Web/WASM инициализация делается через initialize().
 * default() не существует (ты это уже подтвердил через Object.keys()).
 */
let wasmInitPromise: Promise<void> | null = null;
async function ensureLineraInitialized(): Promise<void> {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      // initialize есть в exports у 0.15.7
      await linera.initialize();
    })();
  }
  await wasmInitPromise;
}

let clientPromise: Promise<linera.Client> | null = null;
let backendPromise: Promise<Backend> | null = null;

async function getClient(): Promise<linera.Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      await ensureLineraInitialized();

      const faucet = new linera.Faucet(FAUCET_URL);

      // В 0.15.7 createWallet() возвращает Wallet (под капотом может быть InMemoryWallet).
      const wallet = await faucet.createWallet();

      // Важно: если конструктор Client требует signer/flags, TypeScript тебе покажет.
      // Ты уже видел, что ts ругался когда типы не сходились, но сейчас у тебя всё компилируется.
      const client = new linera.Client(wallet);

      const chainId = await faucet.claimChain(client);
      console.info("[Linera] chain:", chainId);

      return client;
    })();
  }
  return clientPromise;
}

export async function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (!APP_ID) {
        throw new Error("VITE_LINERA_APP_ID is missing (.env.local).");
      }

      const client = await getClient();

      // Если в 0.15.7 метод называется иначе (например, client.application(APP_ID)),
      // эта строка упадёт сразу и мы поправим под фактический API.
      const backend = await client.frontend().application(APP_ID);

      const maybe = backend as unknown;
      if (!isRecord(maybe) || typeof maybe.query !== "function") {
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

/**
 * Introspection: чтобы навсегда закрыть тему snake/camel naming.
 * Вызовешь — получишь реальные названия Query/Mutation полей из сервиса.
 */
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
