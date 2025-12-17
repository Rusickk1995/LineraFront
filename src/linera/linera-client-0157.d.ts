// src/types/linera-client-0157.d.ts
import "@linera/client";

declare module "@linera/client" {
  /**
   * Present in JS exports of @linera/client@0.15.7 (you verified via Object.keys()).
   * Missing from shipped .d.ts => we augment locally.
   */
  export function initialize(): Promise<void>;
}
