declare module "@linera/client" {
  // WASM init entrypoints (типы могут отставать)
  export function initialize(): Promise<void>;
  export function main(): Promise<void>;
  export function initSync(...args: any[]): void;

  export class Wallet {
    // Мы не знаем точные методы, поэтому даём безопасные optional-хелперы
    // (код будет проверять наличие в рантайме).
    owner?: () => string | Promise<string>;
    defaultOwner?: () => string | Promise<string>;
    getOwner?: () => string | Promise<string>;
    getDefaultOwner?: () => string | Promise<string>;
  }

  export class Faucet {
    constructor(url: string);
    createWallet(): Promise<Wallet>;

    // ВАЖНО: по твоему выводу реальная сигнатура именно такая.
    claimChain(wallet: Wallet, owner: string): Promise<string>;
  }

  export class Application {
    query(request: string): Promise<string>;
  }

  export class Client {
    constructor(wallet: Wallet, signer?: unknown);
    frontend(): { application(appId: string): Promise<Application> };
  }
}
