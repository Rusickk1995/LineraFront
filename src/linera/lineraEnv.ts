// src/linera/lineraEnv.ts
//
// Конфигурация Linera Poker:
//   - APP_ID приложения
//   - CHAIN_ID цепочки, где оно задеплоено
//   - FAUCET_URL для Conway testnet
//
// Все значения берутся из import.meta.env.*
// Ошибка кидается, если переменная отсутствует.
// -----------------------------------------------------------------------------

// Небольшой безопасный helper: у Vite типизированный import.meta.env,
// но реальный объект всегда имеет тип any под капотом.
function readEnv(key: string): string | undefined {
  return (import.meta as unknown as { env: Record<string, string | undefined> })
    .env[key];
}

// -----------------------------------------------------------------------------
// RAW значения из ENV
// -----------------------------------------------------------------------------

const RAW_APP_ID = readEnv("VITE_LINERA_APP_ID");
const RAW_CHAIN_ID = readEnv("VITE_LINERA_CHAIN_ID");
const RAW_FAUCET_URL =
  readEnv("VITE_LINERA_FAUCET_URL") ??
  "https://faucet.testnet-conway.linera.net";

// -----------------------------------------------------------------------------
// Строгая проверка ENV
// -----------------------------------------------------------------------------

export function requireEnv(
  name: string,
  value: string | undefined
): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing env variable ${name}. Configure import.meta.env.${name} in .env.local or Vercel Environment Variables.`
    );
  }
  return value;
}

// -----------------------------------------------------------------------------
// Финальные экспортируемые константы
// -----------------------------------------------------------------------------

export const LINERA_APP_ID = requireEnv(
  "VITE_LINERA_APP_ID",
  RAW_APP_ID
);

export const LINERA_CHAIN_ID = requireEnv(
  "VITE_LINERA_CHAIN_ID",
  RAW_CHAIN_ID
);

export const LINERA_FAUCET_URL = requireEnv(
  "VITE_LINERA_FAUCET_URL",
  RAW_FAUCET_URL
);

// -----------------------------------------------------------------------------
// Отладочный вывод (полностью безопасный, можно удалить)
// -----------------------------------------------------------------------------

console.log(
  "[lineraEnv] Loaded ENV:",
  {
    APP_ID: LINERA_APP_ID,
    CHAIN_ID: LINERA_CHAIN_ID,
    FAUCET_URL: LINERA_FAUCET_URL,
  }
);

// Делаем APP_ID доступным в DevTools
(window as unknown as { APP_ID_DEBUG?: string }).APP_ID_DEBUG = LINERA_APP_ID;
