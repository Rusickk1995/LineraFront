declare module "@linera/client" {
  export default function init(): Promise<void>; // соответствует await linera.default() :contentReference[oaicite:3]{index=3}

  export type Wallet = unknown;

  export interface Notification {
    reason?: { NewBlock?: unknown };
  }

  export interface ApplicationBackend {
    query(request: string): Promise<string>;
  }

  export class Faucet {
    constructor(url: string);
    createWallet(): Promise<Wallet>;
    claimChain(client: Client): Promise<string>;
  }

  export class Client {
    constructor(wallet: Wallet);
    frontend(): {
      application(appId: string): Promise<ApplicationBackend>;
    };
    onNotification(cb: (n: Notification) => void): void;
  }
}
