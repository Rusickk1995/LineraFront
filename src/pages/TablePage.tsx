// src/pages/TablePage.tsx
//
// Ончейн-стол с полной поддержкой string-based tableId (u64),
// совместимый с fetchTable(tableId: string), sendPlayerAction(...)
// и DevMultiSeat режимом.
// Без any. Без урезаний.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchTable,
  sendPlayerAction,
} from "../linera/lineraClient";

import type { OnChainTableViewDto } from "../types/onchain";

import {
  mapTableToUi,
  type UiTableFromOnchain,
} from "../mappers/onchainToUi";

import OvalTable from "../components/OvalTable";
import { DEV_MULTI_SEAT_MODE } from "../config/devFlags";
import DevTableTools from "../components/DevTableTools";

// Временный игрок (как во всех dev-страницах).
// Внимание: в UI Player.id и heroId строковые, поэтому здесь тоже строка.
const DEV_PLAYER_ID = "1";

// Локальный UI-тип действий. Это НЕ on-chain enum, а именно то,
// что приходит из кнопок интерфейса.
type PlayerActionKindUiButton =
  | "fold"
  | "check_or_call"
  | "bet"
  | "raise";

// Тип действий, который реально уходит в sendPlayerAction / on-chain.
// Соответствует PlayerActionKindUi из pokerApi.
type PlayerActionKindWire = "fold" | "check" | "call" | "bet" | "raise";

const TablePage: React.FC = () => {
  const navigate = useNavigate();
  const { tableId: tableIdParam } = useParams<{ tableId: string }>();

  // tableId всегда строка. Если нет → навигируем в Lobby.
  const tableId: string | null = useMemo(() => {
    if (!tableIdParam) return null;
    return tableIdParam;
  }, [tableIdParam]);

  // onchainView сейчас используется только как "сырой" снимок,
  // но мы его оставляем (может пригодиться для дебага / будущих фич).
  const [, setOnchainView] = useState<OnChainTableViewDto | null>(null);

  const [uiView, setUiView] =
    useState<UiTableFromOnchain | null>(null);

  const [loading, setLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [betAmount, setBetAmount] = useState("");

  // Если tableId отсутствует в URL — сразу уходим
  useEffect(() => {
    if (tableId === null) {
      navigate("/lobby");
    }
  }, [tableId, navigate]);

  // ---------------------------- LOAD TABLE ----------------------------

  const loadTable = useCallback(
    async (tid: string) => {
      setLoading(true);
      setError(null);

      try {
        const onchain = await fetchTable(tid);

        if (!onchain) {
          setOnchainView(null);
          setUiView(null);
          return;
        }

        setOnchainView(onchain);

        const ui = mapTableToUi(onchain, DEV_PLAYER_ID);
        setUiView(ui);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load table";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Первичная загрузка и обновление при смене id
  useEffect(() => {
    if (tableId !== null) {
      void loadTable(tableId);
    }
  }, [tableId, loadTable]);

  // ---------------------------- ACTION HANDLER ----------------------------

  const handleSendAction = async (kind: PlayerActionKindUiButton) => {
    if (!tableId || !uiView) return;

    setCommandLoading(true);
    setError(null);

    try {
      let action: PlayerActionKindWire = "fold";
      let amount: number | undefined;

      const currentBet = uiView.gameState.currentBet;

      switch (kind) {
        case "fold":
          action = "fold";
          break;

        case "check_or_call":
          action = currentBet > 0 ? "call" : "check";
          break;

        case "bet":
          action = "bet";
          amount = Number(betAmount) || 0;
          break;

        case "raise":
          action = "raise";
          amount = Number(betAmount) || 0;
          break;
      }

      await sendPlayerAction(tableId, action, amount);
      await loadTable(tableId);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to send action";
      setError(message);
    } finally {
      setCommandLoading(false);
    }
  };

  // ---------------------------- RENDER ----------------------------

  if (tableId === null) return null;

  const isBusy = loading || commandLoading;

  const potLabel = uiView
    ? uiView.gameState.pot.toLocaleString()
    : "0";

  const currentBetValue = uiView
    ? uiView.gameState.currentBet
    : 0;

  const currentBetLabel = currentBetValue.toLocaleString();

  const heroPlayer =
    uiView?.players.find((p) => p.id === DEV_PLAYER_ID);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white flex flex-col">
      {/* HEADER */}
      <header className="w-full border-b border-white/10 bg-black/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-2 py-1 text-xs rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition"
              >
                ← Back
              </button>

              <div className="flex flex-col">
                <span className="text-xs text-gray-400 uppercase tracking-[0.2em]">
                  Linera Poker / Table
                </span>
                <span className="text-sm font-semibold">
                  Table #{tableId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="px-3 py-1 rounded-full bg-black/60 border border-white/15">
                Pot:{" "}
                <span className="font-semibold">{potLabel}</span>
              </div>

              <div className="px-3 py-1 rounded-full bg-black/60 border border-white/15">
                Current bet:{" "}
                <span className="font-semibold">{currentBetLabel}</span>
              </div>

              {heroPlayer && (
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/60 text-emerald-300">
                  You:{" "}
                  <span className="font-semibold">
                    {heroPlayer.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {DEV_MULTI_SEAT_MODE && (
            <DevTableTools
              tableId={tableId}
              onReload={() => void loadTable(tableId)}
            />
          )}
        </div>
      </header>

      {/* TABLE AREA */}
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-6 gap-4">
        {(loading || commandLoading) && (
          <div className="text-xs text-gray-400">
            {loading
              ? "Loading table state..."
              : "Sending action..."}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400">{error}</div>
        )}

        <div className="relative w-full flex-1 min-h-[420px] md:min-h-[520px]">
          {uiView ? (
            <OvalTable
              players={uiView.players}
              communityCards={uiView.communityCards}
              pot={uiView.gameState.pot}
              currentBet={uiView.gameState.currentBet}
              street={uiView.gameState.street}
              heroId={DEV_PLAYER_ID}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
              No table data yet
            </div>
          )}
        </div>

        {/* ACTION PANEL */}
        <section className="mt-4 border-t border-white/10 pt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isBusy}
                onClick={() => handleSendAction("fold")}
                className="px-4 py-2 rounded-xl border border-red-500/60 bg-red-500/10 text-sm hover:bg-red-500/20 disabled:opacity-50 transition"
              >
                Fold
              </button>

              <button
                disabled={isBusy}
                onClick={() => handleSendAction("check_or_call")}
                className="px-4 py-2 rounded-xl border border-slate-500/60 bg-slate-500/10 text-sm hover:bg-slate-500/20 disabled:opacity-50 transition"
              >
                {currentBetValue > 0 ? "Call" : "Check"}
              </button>

              <button
                disabled={isBusy || !betAmount}
                onClick={() => handleSendAction("bet")}
                className="px-4 py-2 rounded-xl border border-emerald-500/60 bg-emerald-500/10 text-sm hover:bg-emerald-500/20 disabled:opacity-50 transition"
              >
                Bet
              </button>

              <button
                disabled={isBusy || !betAmount}
                onClick={() => handleSendAction("raise")}
                className="px-4 py-2 rounded-xl border border-amber-500/60 bg-amber-500/10 text-sm hover:bg-amber-500/20 disabled:opacity-50 transition"
              >
                Raise
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span>Amount</span>
              <input
                type="number"
                min={0}
                step={1}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-lg bg-black/70 border border-white/15 text-sm outline-none focus:border-red-400"
                placeholder="Size"
              />
              <button
                disabled={isBusy}
                onClick={() => tableId && void loadTable(tableId)}
                className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-xs disabled:opacity-50 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TablePage;
