// src/linera/lineraEnv.ts
//
// Конфиг Linera Poker (APP_ID и FAUCET_URL) из ENV.

const RAW_APP_ID =
  (import.meta as any).env.VITE_LINERA_APP_ID as string | undefined;

const RAW_FAUCET_URL =
  ((import.meta as any).env.VITE_LINERA_FAUCET_URL as string | undefined) ??
  "https://faucet.testnet-conway.linera.net";

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing env variable ${name}. Configure import.meta.env.${name} (e.g. in .env.local / Vercel env).`
    );
  }
  return value;
}

export const LINERA_APP_ID = requireEnv("VITE_LINERA_APP_ID", RAW_APP_ID);
export const LINERA_FAUCET_URL = requireEnv(
  "VITE_LINERA_FAUCET_URL",
  RAW_FAUCET_URL
);

// DEBUG: проверяем, что APP_ID в бандле корректный
console.log("[lineraEnv] LINERA_APP_ID from bundle =", LINERA_APP_ID);
(window as any).APP_ID_DEBUG = LINERA_APP_ID;
