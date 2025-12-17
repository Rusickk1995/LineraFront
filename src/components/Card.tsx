// src/components/Card.tsx

import React from "react";
import type { UICard, UISuit } from "../types/poker";

type CardProps = {
  card: UICard;
  size?: "sm" | "md" | "lg";
  dimmed?: boolean;
  /** Перекрывает card.hidden, если хочешь насильно скрыть карту */
  forceHidden?: boolean;
};

const suitToSymbol: Record<UISuit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const Card: React.FC<CardProps> = ({
  card,
  size = "md",
  dimmed = false,
  forceHidden = false,
}) => {
  const isHidden = card.hidden || forceHidden;

  const base =
    "rounded-lg border border-white/15 bg-black/70 flex flex-col items-center justify-center select-none shadow-[0_0_12px_rgba(0,0,0,0.7)]";
  const sizeClasses =
    size === "sm"
      ? "w-7 h-10 text-[10px]"
      : size === "lg"
      ? "w-12 h-16 text-base"
      : "w-9 h-13 text-sm";

  if (isHidden) {
    return (
      <div
        className={[
          base,
          sizeClasses,
          dimmed ? "opacity-40" : "opacity-100",
          "bg-gradient-to-br from-slate-800 via-slate-950 to-black border-slate-500/40",
        ].join(" ")}
      >
        <div className="w-4/5 h-3/5 rounded-md border border-slate-500/40 bg-slate-900/80" />
      </div>
    );
  }

  const suitSymbol = suitToSymbol[card.suit];
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const colorClass = isRed ? "text-red-400" : "text-slate-100";

  return (
    <div
      className={[
        base,
        sizeClasses,
        dimmed ? "opacity-40" : "opacity-100",
        "bg-gradient-to-br from-black via-slate-950 to-slate-900",
      ].join(" ")}
    >
      <div className="flex flex-col items-center leading-tight">
        <span className={`font-semibold ${colorClass}`}>{card.rank}</span>
        <span className={colorClass}>{suitSymbol}</span>
      </div>
    </div>
  );
};

export default Card;
