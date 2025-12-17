// src/components/DevTableTools.tsx
//
// Dev-панель для быстрого наполнения стола фиктивными игроками:
// - посадить 9 игроков на УЖЕ существующий стол;
// - запустить раздачу;
// Работает ТОЛЬКО в dev-режиме, в проде не рендерится.

import React, { useCallback, useState } from "react";
import {
  seatPlayer,
  startHand,
  type MutationAck,
} from "../linera/lineraClient";

// Фиктивные игроки для dev-стола.
const DEV_PLAYERS: {
  playerId: number;
  seatIndex: number;
  displayName: string;
  initialStack: number;
}[] = [
  { playerId: 2, seatIndex: 1, displayName: "Dev Player #2", initialStack: 5000 },
  { playerId: 3, seatIndex: 2, displayName: "Dev Player #3", initialStack: 5000 },
  { playerId: 4, seatIndex: 3, displayName: "Dev Player #4", initialStack: 5000 },
  { playerId: 5, seatIndex: 4, displayName: "Dev Player #5", initialStack: 5000 },
  { playerId: 6, seatIndex: 5, displayName: "Dev Player #6", initialStack: 5000 },
  { playerId: 7, seatIndex: 6, displayName: "Dev Player #7", initialStack: 5000 },
  { playerId: 8, seatIndex: 7, displayName: "Dev Player #8", initialStack: 5000 },
  { playerId: 9, seatIndex: 8, displayName: "Dev Player #9", initialStack: 5000 },
];

interface DevTableToolsProps {
  // ВАЖНО: тот же самый tableId, что и в URL /tables/:tableId
  tableId: string;
  onReload: () => void;
}

const DevTableTools: React.FC<DevTableToolsProps> = ({
  tableId,
  onReload,
}) => {
  const [busy, setBusy] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  // Полное наполнение: посадить 9 игроков и стартануть раздачу
  const handleFullSetup = useCallback(async () => {
    setBusy(true);
    setLastMessage("");

    try {
      // 1) Сажаем всех dev-игроков на УЖЕ существующий стол.
      for (const p of DEV_PLAYERS) {
        const seatAck: MutationAck = await seatPlayer({
          tableId,
          playerId: p.playerId,
          seatIndex: p.seatIndex,
          displayName: p.displayName,
          initialStack: p.initialStack,
        });

        if (!seatAck.ok) {
          setLastMessage(
            `SeatPlayer failed for playerId=${p.playerId}, seat=${p.seatIndex}: ${seatAck.message}`,
          );
          setBusy(false);
          return;
        }
      }

      // 2) Стартуем первую раздачу.
      const handId = Math.floor(Date.now() / 1000);
      const handAck: MutationAck = await startHand({
        tableId,
        handId,
      });

      if (!handAck.ok) {
        setLastMessage(`StartHand failed: ${handAck.message}`);
        setBusy(false);
        return;
      }

      setLastMessage(
        `Dev players seated (${DEV_PLAYERS.length}) on table=${tableId}, hand started (handId=${handId}).`,
      );

      onReload();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : `Unknown error: ${String(e)}`;
      console.error("[DevTableTools] full setup error", e);
      setLastMessage(`Dev setup error: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [tableId, onReload]);

  // Просто начать новую раздачу на этом же столе
  const handleStartNewHand = useCallback(async () => {
    setBusy(true);
    setLastMessage("");

    try {
      const handId = Math.floor(Date.now() / 1000);
      const handAck: MutationAck = await startHand({
        tableId,
        handId,
      });

      if (!handAck.ok) {
        setLastMessage(`StartHand failed: ${handAck.message}`);
        setBusy(false);
        return;
      }

      setLastMessage(
        `New hand started on dev table ${tableId} (handId=${handId}).`,
      );
      onReload();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : `Unknown error: ${String(e)}`;
      console.error("[DevTableTools] start new hand error", e);
      setLastMessage(`Dev start hand error: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [tableId, onReload]);

  return (
    <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs text-amber-100 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-wide uppercase text-[10px] text-amber-300">
          Dev multi-seat mode
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleFullSetup}
            className="px-3 py-1 rounded-lg border border-amber-400/70 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition text-[11px] font-medium"
          >
            Seat 8 players + Start hand
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleStartNewHand}
            className="px-3 py-1 rounded-lg border border-amber-400/70 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition text-[11px]"
          >
            New hand
          </button>
        </div>
      </div>
      {busy && (
        <div className="text-[10px] text-amber-200/80">
          Running dev setup...
        </div>
      )}
      {lastMessage && (
        <div className="text-[10px] text-amber-200/90">
          {lastMessage}
        </div>
      )}
      <div className="text-[10px] text-amber-200/70">
        Only for development. Seats 8 local players to the current table and
        lets you drive the whole hand from a single browser.
      </div>
    </div>
  );
};

export default DevTableTools;
