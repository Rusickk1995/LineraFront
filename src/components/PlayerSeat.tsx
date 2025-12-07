// src/components/PlayerSeat.tsx

import React from "react";
import type { Player, UICard } from "../types/poker";
import Card from "./Card";

type PlayerSeatProps = {
  player: Player;
  /** Текущий действующий игрок за столом */
  isCurrent: boolean;
  /** Является ли это "героем" (текущий пользователь) */
  isHero?: boolean;
  /** Текущая ставка игрока в этом раунде */
  bet: number;
  /** Опциональное текстовое описание лучшей комбинации (из движка/ончейна) */
  bestHandDescription?: string;
  /** Если передать, эти карты будут показаны как hole-cards (можешь переопределить player.cards) */
  holeCardsOverride?: UICard[];
};

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrent,
  isHero,
  bet,
  bestHandDescription,
  holeCardsOverride,
}) => {
  const status =
    player.isFolded ? "folded" : player.isAllIn ? "allin" : "active";

  const statusLabel =
    status === "folded" ? "Folded" : status === "allin" ? "All-in" : "Active";

  const statusClass =
    status === "folded"
      ? "text-gray-500"
      : status === "allin"
      ? "text-red-400"
      : "text-emerald-400";

  const baseBorder =
    "rounded-xl border bg-black/50 p-3 flex flex-col gap-1 text-xs";
  const activeGlow = isCurrent
    ? "border-red-500 shadow-[0_0_25px_rgba(248,113,113,0.7)]"
    : "border-white/15";

  const cards: UICard[] =
    holeCardsOverride ?? player.cards ?? [];

  return (
    <div className={`${baseBorder} ${activeGlow}`}>
      {/* Верхняя строка: имя + статус + позиции (D / SB / BB) */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {player.name}
            {isHero && " (You)"}
          </span>

          <div className="flex gap-1 text-[9px] uppercase">
            {player.isDealer && (
              <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/60">
                D
              </span>
            )}
            {player.isSmallBlind && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/60">
                SB
              </span>
            )}
            {player.isBigBlind && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/60">
                BB
              </span>
            )}
          </div>
        </div>

        <span className={`text-[10px] ${statusClass}`}>{statusLabel}</span>
      </div>

      {/* Стек / ставка */}
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-gray-300">
          Stack:{" "}
          <span className="font-semibold">
            {player.stack.toLocaleString()}
          </span>
        </span>
        <span className="text-gray-400">
          Bet: <span className="font-semibold">{bet}</span>
        </span>
      </div>

      {/* Hole-cards */}
      <div className="flex gap-1 mt-1">
        {cards.length === 0 && (
          <span className="text-[10px] text-gray-500">No cards</span>
        )}
        {cards.map((card, idx) => (
          <Card
            key={idx}
            card={card}
            size="md"
            dimmed={status === "folded"}
            forceHidden={card.hidden}
          />
        ))}
      </div>

      {/* Лучшая комбинация, если есть */}
      {bestHandDescription && (
        <div className="mt-1 text-[10px] text-gray-300">
          Best: {bestHandDescription}
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;
