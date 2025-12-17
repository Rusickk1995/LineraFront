import React from "react";
import type { Player, UICard } from "../types/poker";
import CommunityCards from "./CommunityCards";
import PlayerSeat from "./PlayerSeat";

export interface OvalTableProps {
  players: Player[];
  communityCards: UICard[];
  pot: number;
  currentBet: number;
  street: string;
  heroId?: string;
}

function normalizeStreetLabel(street?: string): string {
  if (!street) return "WAITING";
  const lower = street.toLowerCase();
  return lower === "waiting" ? "WAITING" : lower.toUpperCase();
}

const OvalTable: React.FC<OvalTableProps> = ({
  players,
  communityCards,
  pot,
  currentBet,
  street,
  heroId,
}) => {
  const streetLabel = normalizeStreetLabel(street);

  const sorted = [...players].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  const hero = heroId ? sorted.find((p) => p.id === heroId) : undefined;
  const others = hero ? sorted.filter((p) => p.id !== hero.id) : sorted;

  const half = Math.ceil(others.length / 2);
  const top = others.slice(0, half);
  const bottom = others.slice(half);

  return (
    <div className="relative w-full h-full min-h-[480px] md:min-h-[560px]">

      {/* Glow */}
      <div className="absolute inset-0 rounded-[999px] bg-gradient-to-br 
          from-black via-rose-950/80 to-black 
          shadow-[0_0_80px_rgba(248,113,113,0.6)]" />

      {/* Felt */}
      <div className="absolute inset-[5%] md:inset-[6%] rounded-[999px]
          bg-gradient-to-br from-black via-slate-950 to-black
          border border-red-500/50" />

      {/* Inner ring */}
      <div className="absolute inset-[13%] md:inset-[14%] rounded-[999px]
          border border-red-500/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]" />

      {/* Center info */}
      <div className="absolute inset-[18%] md:inset-[19%] flex flex-col 
          items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] tracking-[0.25em] uppercase text-red-400">
            {streetLabel}
          </span>

          <div className="flex items-center gap-4 text-xs text-gray-200">
            <div className="px-3 py-1 rounded-full bg-black/60 border border-white/15">
              Pot: <span className="font-semibold">{pot}</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-black/60 border border-white/15">
              Current bet:{" "}
              <span className="font-semibold">
                {currentBet}
              </span>
            </div>
          </div>
        </div>

        <CommunityCards board={communityCards} />
      </div>

      {/* Top row */}
      <div className="absolute top-[8%] left-[8%] right-[8%] flex justify-between gap-2">
        {top.map((p) => (
          <div key={p.id} className="flex-1 flex justify-center">
            <PlayerSeat
              player={p}
              isCurrent={false}
              isHero={heroId === p.id}
              bet={0}
            />
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="absolute bottom-[6%] left-[6%] right-[6%] flex justify-between 
          gap-3 items-end">
        {bottom.map((p) => (
          <div key={p.id} className="flex-1 flex justify-center">
            <PlayerSeat
              player={p}
              isCurrent={false}
              isHero={heroId === p.id}
              bet={0}
            />
          </div>
        ))}

        {hero && (
          <div className="flex-1 flex justify-center">
            <PlayerSeat
              player={hero}
              isCurrent={true}
              isHero={true}
              bet={0}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default OvalTable;
