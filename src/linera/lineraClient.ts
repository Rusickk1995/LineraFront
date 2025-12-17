import * as linera from "@linera/client";

const FAUCET_URL =
  import.meta.env.VITE_LINERA_FAUCET_URL ??
  "https://faucet.testnet-conway.linera.net";

const APP_ID = import.meta.env.VITE_LINERA_APP_ID as string | undefined;

export type Backend = { query(request: string): Promise<string> };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

let wasmInitPromise: Promise<void> | null = null;
async function ensureLineraWasm(): Promise<void> {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const anyLinera = linera as any;
      if (typeof anyLinera.initialize === "function") return anyLinera.initialize();
      if (typeof anyLinera.main === "function") return anyLinera.main();
      if (typeof anyLinera.initSync === "function") return anyLinera.initSync();
      throw new Error("@linera/client: no WASM init entrypoint (initialize/main/initSync).");
    })();
  }
  return wasmInitPromise;
}

async function resolveOwner(wallet: linera.Wallet): Promise<string> {
  // Детерминированно: проверяем, какие методы реально есть, и используем первый валидный.
  const w: any = wallet;
  const candidates = ["defaultOwner", "getDefaultOwner", "owner", "getOwner"];

  for (const name of candidates) {
    const fn = w?.[name];
    if (typeof fn === "function") {
      const res = await fn.call(w);
      if (typeof res === "string" && res.length > 0) return res;
    }
  }

  // Если не нашли — это не “гадание”, это стоп с понятным действием:
  // надо один раз посмотреть методы Wallet и выбрать правильный.
  throw new Error(
    "Cannot resolve wallet owner string. Wallet has no known owner getter. " +
      "Run: node -e \"import('@linera/client').then(({Wallet})=>console.log(Object.getOwnPropertyNames(Wallet.prototype))).catch(console.error)\""
  );
}

let clientPromise: Promise<linera.Client> | null = null;
let backendPromise: Promise<Backend> | null = null;

async function getClient(): Promise<linera.Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      await ensureLineraWasm();

      const faucet = new linera.Faucet(FAUCET_URL);
      const wallet = await faucet.createWallet();

      const owner = await resolveOwner(wallet);
      const chainId = await faucet.claimChain(wallet, owner);

      console.info("[Linera] owner:", owner);
      console.info("[Linera] chain:", chainId);

      return new linera.Client(wallet);
    })();
  }
  return clientPromise;
}

export async function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (!APP_ID) throw new Error("VITE_LINERA_APP_ID is missing.");

      const client = await getClient();
      const app = await client.frontend().application(APP_ID);

      if (!isRecord(app) || typeof (app as any).query !== "function") {
        throw new Error("Application does not expose query(request: string): Promise<string>");
      }

      return { query: (req: string) => (app as any).query(req) };
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

  const parsed = JSON.parse(raw) as any;
  if (parsed?.errors?.length) {
    throw new Error(parsed.errors.map((e: any) => e?.message ?? "Unknown error").join("; "));
  }
  if (parsed?.data === undefined) throw new Error("GraphQL response has no data");
  return parsed.data as TData;
}

export async function listGraphQLOperations(): Promise<{ queries: string[]; mutations: string[] }> {
  const q = `
    query {
      __schema {
        queryType { fields { name } }
        mutationType { fields { name } }
      }
    }
  `;
  const data = await gql<any>(q);
  return {
    queries: (data.__schema?.queryType?.fields ?? []).map((f: any) => f.name),
    mutations: (data.__schema?.mutationType?.fields ?? []).map((f: any) => f.name),
  };
}

export * from "./pokerApi";
