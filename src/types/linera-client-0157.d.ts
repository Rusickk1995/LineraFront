// src/types/linera-client-0157.d.ts
declare module "@linera/client" {
  /**
   * В @linera/client@0.15.7 в runtime есть initialize(), но TS-типы могут отставать.
   */
  export function initialize(): Promise<void>;

  /**
   * В некоторых сборках может быть default-init, но у тебя он undefined.
   * Оставляем как optional, чтобы TS не мешал.
   */
  const defaultInit: undefined | (() => Promise<void>);
  export default defaultInit;

  /**
   * В runtime 0.15.7 Faucet.claimChain именно (wallet, owner).
   * Добавляем перегрузку, не ломая существующие типы пакета.
   */
  interface Faucet {
    claimChain(wallet: Wallet, owner: string): Promise<string>;
  }

  /**
   * Для извлечения owner мы будем пробовать методы signer-а.
   * Описываем как optional, чтобы TS не мешал и чтобы код был переносимым.
   */
  interface PrivateKeySigner {
    address?: () => Promise<string> | string;
    owner?: () => Promise<string> | string;
    publicKey?: () => Promise<string> | string;
  }
}

export {};
