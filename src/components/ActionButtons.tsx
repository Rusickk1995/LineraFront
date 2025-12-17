// src/components/ActionButtons.tsx

import React from "react";

type ActionButtonsProps = {
  betSize: number;
  minBet: number;
  maxBet: number;
  isHeroTurn: boolean;
  canCheck: boolean;
  betButtonLabel: string;
  onBetSizeChange: (raw: string) => void;
  onFold: () => void;
  onCheckCall: () => void;
  onBetRaise: () => void;
  onAllIn: () => void;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  betSize,
  minBet,
  maxBet,
  isHeroTurn,
  canCheck,
  betButtonLabel,
  onBetSizeChange,
  onFold,
  onCheckCall,
  onBetRaise,
  onAllIn,
}) => {
  return (
    <div className="flex flex-col gap-2 text-xs">
      {/* Bet size */}
      <div className="flex items-center gap-2">
        <span>Bet size:</span>
        <input
          type="number"
          className="w-24 rounded bg-black/60 border border-white/20 px-2 py-1"
          value={betSize}
          min={minBet}
          max={maxBet > 0 ? maxBet : undefined}
          onChange={(e) => onBetSizeChange(e.target.value)}
          disabled={!isHeroTurn}
        />
        <span className="text-[10px] text-gray-400">
          min {minBet}
          {maxBet > 0 ? ` · max ${maxBet}` : ""}
        </span>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          className="px-4 py-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-900 disabled:text-gray-500"
          onClick={onFold}
          disabled={!isHeroTurn}
        >
          Fold
        </button>
        <button
          className="px-4 py-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-900 disabled:text-gray-500"
          onClick={onCheckCall}
          disabled={!isHeroTurn}
        >
          {canCheck ? "Check" : "Call"}
        </button>
        <button
          className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 disabled:bg-gray-900 disabled:text-gray-500"
          onClick={onBetRaise}
          disabled={!isHeroTurn}
        >
          {betButtonLabel}
        </button>
        <button
          className="px-4 py-2 rounded-full bg-red-800 hover:bg-red-700 disabled:bg-gray-900 disabled:text-gray-500"
          onClick={onAllIn}
          disabled={!isHeroTurn}
        >
          All-in
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
