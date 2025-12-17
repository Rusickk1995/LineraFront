// src/config/devFlags.ts
//
// Флаги разработчика, включаются через VITE_* env-переменные.

export const DEV_MULTI_SEAT_MODE: boolean =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_DEV_MULTI_SEAT_MODE === "true";
