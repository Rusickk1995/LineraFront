// src/pages/LandingPage.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBackend } from "../linera/lineraClient";

const isDev = import.meta.env.DEV;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handlePlayTournament() {
    if (isConnecting) return;

    setErrorMessage(null);
    setIsConnecting(true);

    try {
      console.log("[LandingPage] Connecting to Linera backend...");
      const startedAt = Date.now();

      // Здесь под капотом:
      //  - initLinera()
      //  - Faucet + createWallet()
      //  - claimChain()
      //  - Client + Application(APP_ID)
      const backend = await getBackend();

      const elapsed = Date.now() - startedAt;
      console.log(
        "[LandingPage] getBackend() resolved in",
        elapsed,
        "ms; backend =",
        backend
      );

      // Защитимся от тихого null/undefined
      if (!backend) {
        const err = new Error(
          "getBackend() вернул null/undefined — Linera backend не инициализирован"
        );
        console.error("[LandingPage] Backend is falsy:", err);
        throw err;
      }

      console.log(
        "[LandingPage] Linera backend ready, navigating to lobby..."
      );
      navigate("/lobby");
    } catch (e: unknown) {
      const err = e as any;

      console.error("[LandingPage] Failed to connect to Linera backend:", err);

      // Базовое сообщение для пользователя
      let userMessage =
        "Не удалось подключиться к Linera testnet. Попробуйте обновить страницу или зайти позже.";

      // Если есть текст ошибки — добавим его
      if (err?.message) {
        userMessage += `\nДетали: ${String(err.message)}`;
      }

      // В dev-режиме выводим максимум данных в консоль
      if (isDev) {
        // Часто полезно увидеть stack и возможный ответ backend’а
        const debugDetails = {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
          cause: err?.cause,
          response: err?.response,
          lineraError: err?.lineraError,
        };
        console.error(
          "[LandingPage] Debug error details (dev only):",
          debugDetails
        );
      }

      setErrorMessage(userMessage);
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Hero-секция */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 rounded-full bg-red-600/40 flex items-center justify-center shadow-[0_0_40px_rgba(248,113,113,0.8)]">
              <span className="text-4xl">♠</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[0.25em] mb-4">
            <span className="text-white">LINERA</span>{" "}
            <span className="text-red-500">POKER</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 mb-10">
            On-chain Texas Hold&apos;em for degen grinders. Instant finality,
            fair dealing and transparent pots — powered by Linera&apos;s
            microchains.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handlePlayTournament}
              disabled={isConnecting}
              className={`inline-flex items-center justify-center px-10 py-4 rounded-full text-base sm:text-lg font-semibold
                bg-red-600 hover:bg-red-500 disabled:bg-red-800
                shadow-[0_0_40px_rgba(248,113,113,0.8)]
                transition-colors transition-shadow duration-200
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black`}
            >
              {isConnecting ? "Connecting to Linera..." : "Play Tournament"}
            </button>

            <p className="text-xs text-gray-400 max-w-md">
              При первом нажатии будет создан Linera-кошелёк и цепочка в
              публичном Conway testnet. Все дальнейшие действия за столом будут
              подписываться этим кошельком автоматически.
            </p>

            {errorMessage && (
              <p className="text-xs text-red-400 whitespace-pre-line max-w-md">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Фичи ниже можно оставить как у тебя было */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <span className="text-xl">⚡</span> Instant Finality
            </h3>
            <p className="text-sm text-gray-400">
              No waiting for blocks. Hands resolve quickly thanks to Linera
              microchains and fast execution.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <span className="text-xl">🃏</span> Transparent Pots
            </h3>
            <p className="text-sm text-gray-400">
              Every chip, every pot and every payout is verifiable on-chain.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <span className="text-xl">🧠</span> Tournament Engine
            </h3>
            <p className="text-sm text-gray-400">
              Flexible structures: blinds, antes, rebuys, bounties and more —
              configured in seconds.
            </p>
          </div>
        </section>

        <p className="mt-12 text-xs text-gray-500 max-w-2xl text-center">
          This is a non-custodial, testnet-only poker experience for Linera
          enthusiasts. No real-money gambling, only experiment and community
          fun.
        </p>
      </main>
    </div>
  );
};

export default LandingPage;
