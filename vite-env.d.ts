/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_MODE?: string;
  readonly VITE_DEV_FORCE_MIN_PLAYERS?: string;
  readonly VITE_DEV_MULTI_SEAT_MODE?: string;

  readonly VITE_LINERA_RPC_URL: string;
  readonly VITE_LINERA_CHAIN_ID: string;
  readonly VITE_LINERA_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
