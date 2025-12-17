// src/pages/CreateTournamentPage.tsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnteType,
  BlindLevel,
  BlindPace,
  PayoutType,
  TournamentConfig,
} from "../types/poker";
import { createTournament } from "../linera/pokerApi";
import type { OnChainTournamentViewDto } from "../types/onchain";

const CreateTournamentPage: React.FC = () => {
  // Basic
  const [name, setName] = useState("Linera Night Grind #1");
  const [description, setDescription] = useState(
    "Standard Texas Hold'em tournament with configurable structure."
  );
  const [prizeDescription, setPrizeDescription] = useState(
    "Top players receive roles, points or future airdrop allocations."
  );
  const [startTime, setStartTime] = useState("");
  const [regCloseTime, setRegCloseTime] = useState("");

  // Structure & timing
  const [tableSize, setTableSize] = useState(9);
  const [actionTime, setActionTime] = useState(15);
  const [blindLevelDuration, setBlindLevelDuration] = useState(5);
  const [blindPace, setBlindPace] = useState<BlindPace>("regular");

  // Stacks & players
  const [startingStack, setStartingStack] = useState(20000);
  const [maxPlayers, setMaxPlayers] = useState(180);
  const [lateRegMinutes, setLateRegMinutes] = useState(30);

  // Antes / blinds
  const [anteType, setAnteType] = useState<AnteType>("none");
  const [isProgressiveAnte, setIsProgressiveAnte] = useState(false);

  // Payouts
  const [payoutType, setPayoutType] = useState<PayoutType>("topHeavy");
  const [minPayoutPlaces, setMinPayoutPlaces] = useState(15);
  const [guaranteedPrizePool, setGuaranteedPrizePool] = useState(0);

  // Bounty / final table
  const [isBounty, setIsBounty] = useState(false);
  const [bountyAmount, setBountyAmount] = useState(0);
  const [hasFinalTableBonus, setHasFinalTableBonus] = useState(false);
  const [finalTableBonus, setFinalTableBonus] = useState(0);

  // Timebank / breaks
  const [timeBankSeconds, setTimeBankSeconds] = useState(30);
  const [breakEveryMinutes, setBreakEveryMinutes] = useState(60);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(5);

  // Registration
  const [instantRegistration, setInstantRegistration] = useState(true);
  const [reEntryAllowed, setReEntryAllowed] = useState(true);
  const [rebuysAllowed, setRebuysAllowed] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  // UX
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ===== BLIND LEVELS =====
  const blindLevels: BlindLevel[] = useMemo(() => {
    const baseLevels: BlindLevel[] = [
      { level: 1, smallBlind: 100, bigBlind: 200, ante: 0 },
      { level: 2, smallBlind: 150, bigBlind: 300, ante: 0 },
      { level: 3, smallBlind: 200, bigBlind: 400, ante: 0 },
      { level: 4, smallBlind: 300, bigBlind: 600, ante: 0 },
      { level: 5, smallBlind: 400, bigBlind: 800, ante: 0 },
      { level: 6, smallBlind: 500, bigBlind: 1000, ante: 0 },
      { level: 7, smallBlind: 600, bigBlind: 1200, ante: 0 },
    ];

    let multiplier = 1;
    if (blindPace === "turbo") multiplier = 1.5;
    if (blindPace === "hyper") multiplier = 2;
    if (blindPace === "slow") multiplier = 0.8;

    return baseLevels.map((lvl, index) => {
      const factor = Math.pow(multiplier, index);
      const sb = Math.round(lvl.smallBlind * factor);
      const bb = Math.round(lvl.bigBlind * factor);

      let ante = 0;
      if (anteType === "ante") {
        ante = Math.round(bb * 0.125);
      } else if (anteType === "bba") {
        ante = bb;
      }

      return {
        ...lvl,
        smallBlind: sb,
        bigBlind: bb,
        ante,
      };
    });
  }, [blindPace, anteType]);

  const navigate = useNavigate();

  const config: TournamentConfig = useMemo(
    () => ({
      name,
      description,
      prizeDescription,
      startTime,
      regCloseTime,
      tableSize,
      actionTime,
      blindLevelDuration,
      blindPace,
      startingStack,
      maxPlayers,
      lateRegMinutes,
      anteType,
      isProgressiveAnte,
      payoutType,
      minPayoutPlaces,
      guaranteedPrizePool,
      isBounty,
      bountyAmount,
      hasFinalTableBonus,
      finalTableBonus,
      timeBankSeconds,
      breakEveryMinutes,
      breakDurationMinutes,
      instantRegistration,
      reEntryAllowed,
      rebuysAllowed,
      blindLevels,
    }),
    [
      name,
      description,
      prizeDescription,
      startTime,
      regCloseTime,
      tableSize,
      actionTime,
      blindLevelDuration,
      blindPace,
      startingStack,
      maxPlayers,
      lateRegMinutes,
      anteType,
      isProgressiveAnte,
      payoutType,
      minPayoutPlaces,
      guaranteedPrizePool,
      isBounty,
      bountyAmount,
      hasFinalTableBonus,
      finalTableBonus,
      timeBankSeconds,
      breakEveryMinutes,
      breakDurationMinutes,
      instantRegistration,
      reEntryAllowed,
      rebuysAllowed,
      blindLevels,
    ]
  );

  const totalDurationMinutes = useMemo(
    () => blindLevels.length * blindLevelDuration,
    [blindLevels.length, blindLevelDuration]
  );

  const estimatedTables = useMemo(
    () => Math.ceil(maxPlayers / tableSize),
    [maxPlayers, tableSize]
  );

  const handleCreate = async (): Promise<void> => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const created: OnChainTournamentViewDto = await createTournament(config);

      navigate("/lobby", {
        state: { createdTournament: created },
      });
    } catch (error: unknown) {
      console.error("createTournament failed:", error);
      const message =
        error instanceof Error ? error.message : String(error);
      setSubmitError(message || "Failed to create tournament");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-red-950/90 text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.2em]">
              CREATE{" "}
              <span className="text-red-500 drop-shadow-[0_0_15px_rgba(248,113,113,0.9)]">
                TOURNAMENT
              </span>
            </h1>
            <p className="text-sm text-gray-300 mt-2 max-w-xl">
              Configure structure, payouts and advanced settings. This will
              create a Linera Poker tournament config and send you to the lobby.
            </p>
          </div>
          <button
            className="px-6 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-medium"
            onClick={() => navigate("/")}
          >
            ← Back to Landing
          </button>
        </header>

        {submitError && (
          <div className="bg-red-900/40 border border-red-500/60 text-sm text-red-100 rounded-xl px-4 py-3">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* BASIC INFO */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🧾</span> Basic Info
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Tournament Name
                  </label>
                  <input
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-red-500"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setName(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Short Description
                  </label>
                  <textarea
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-red-500 resize-none h-16"
                    value={description}
                    onChange={(
                      e: React.ChangeEvent<HTMLTextAreaElement>
                    ) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Prize Description
                  </label>
                  <textarea
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-red-500 resize-none h-16"
                    value={prizeDescription}
                    onChange={(
                      e: React.ChangeEvent<HTMLTextAreaElement>
                    ) => setPrizeDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Start Time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs outline-none focus:border-red-500"
                      value={startTime}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Registration Closes (optional)
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs outline-none focus:border-red-500"
                      value={regCloseTime}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setRegCloseTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* STRUCTURE */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🏗️</span> Structure &amp; Timing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Table Size
                  </label>
                  <select
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    value={tableSize}
                    onChange={(
                      e: React.ChangeEvent<HTMLSelectElement>
                    ) => setTableSize(Number(e.target.value))}
                  >
                    <option value={6}>6-max</option>
                    <option value={8}>8-max</option>
                    <option value={9}>9-max</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Action Time (sec)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={5}
                    max={60}
                    value={actionTime}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setActionTime(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Blind Level Duration (min)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={3}
                    max={30}
                    value={blindLevelDuration}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setBlindLevelDuration(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Blind Pace
                  </label>
                  <select
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    value={blindPace}
                    onChange={(
                      e: React.ChangeEvent<HTMLSelectElement>
                    ) => setBlindPace(e.target.value as BlindPace)}
                  >
                    <option value="slow">Slow</option>
                    <option value="regular">Regular</option>
                    <option value="turbo">Turbo</option>
                    <option value="hyper">Hyper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Starting Stack
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={1000}
                    value={startingStack}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setStartingStack(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Max Players
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={2}
                    value={maxPlayers}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setMaxPlayers(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Late Registration (min)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={0}
                    value={lateRegMinutes}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setLateRegMinutes(Number(e.target.value))}
                  />
                </div>
              </div>
            </section>

            {/* ANTES & BLINDS */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>💰</span> Antes &amp; Blinds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Ante Type
                  </label>
                  <select
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    value={anteType}
                    onChange={(
                      e: React.ChangeEvent<HTMLSelectElement>
                    ) => setAnteType(e.target.value as AnteType)}
                  >
                    <option value="none">No Ante</option>
                    <option value="ante">Classic Ante</option>
                    <option value="bba">Big Blind Ante</option>
                  </select>
                </div>

                <ToggleRow
                  label="Progressive Ante"
                  description="Ante grows more aggressively on later levels."
                  checked={isProgressiveAnte}
                  onChange={setIsProgressiveAnte}
                />
              </div>
            </section>

            {/* PAYOUTS */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🏆</span> Payouts &amp; Bounties
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Payout Type
                  </label>
                  <select
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    value={payoutType}
                    onChange={(
                      e: React.ChangeEvent<HTMLSelectElement>
                    ) => setPayoutType(e.target.value as PayoutType)}
                  >
                    <option value="topHeavy">Top-heavy (winner focus)</option>
                    <option value="flat">Flatter (more paid places)</option>
                    <option value="satellite">
                      Satellite (tickets / seats)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Min Payout Places
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={3}
                    value={minPayoutPlaces}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setMinPayoutPlaces(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Guaranteed Prize Pool (optional)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                    min={0}
                    value={guaranteedPrizePool}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setGuaranteedPrizePool(Number(e.target.value))}
                  />
                </div>

                <ToggleRow
                  label="Bounty Tournament"
                  description="Each player has a bounty rewarded as roles or points."
                  checked={isBounty}
                  onChange={setIsBounty}
                />

                {isBounty && (
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Bounty Amount (virtual)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                      min={0}
                      value={bountyAmount}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setBountyAmount(Number(e.target.value))}
                    />
                  </div>
                )}

                <ToggleRow
                  label="Final Table Bonus"
                  description="Give extra rewards to all final table players."
                  checked={hasFinalTableBonus}
                  onChange={setHasFinalTableBonus}
                />

                {hasFinalTableBonus && (
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Final Table Bonus Pool (virtual)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                      min={0}
                      value={finalTableBonus}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setFinalTableBonus(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* ADVANCED */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>⚙️</span> Advanced Settings
                </h2>
                <button
                  className="text-xs text-red-400 hover:text-red-300 underline"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Hide" : "Show"}
                </button>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Timebank (sec)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                      min={0}
                      value={timeBankSeconds}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setTimeBankSeconds(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Break Every (min)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                      min={0}
                      value={breakEveryMinutes}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setBreakEveryMinutes(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Break Duration (min)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-red-500"
                      min={0}
                      value={breakDurationMinutes}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => setBreakDurationMinutes(Number(e.target.value))}
                    />
                  </div>

                  <ToggleRow
                    label="Instant Registration"
                    description="Players can register as soon as tournament is created."
                    checked={instantRegistration}
                    onChange={setInstantRegistration}
                  />

                  <ToggleRow
                    label="Re-entry Allowed"
                    description="Busted players can re-enter during late registration."
                    checked={reEntryAllowed}
                    onChange={setReEntryAllowed}
                  />

                  <ToggleRow
                    label="Rebuys Allowed"
                    description="Allow rebuys in early levels (for fun / points, not money)."
                    checked={rebuysAllowed}
                    onChange={setRebuysAllowed}
                  />
                </div>
              )}
            </section>
          </div>

          {/* RIGHT: summary */}
          <div className="space-y-4">
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>📊</span> Summary
              </h2>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-300">Tournament Name</p>
                  <p className="text-sm font-semibold">{name}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-300">Structure</p>
                  <p className="text-sm text-gray-100">
                    {tableSize}-max · {startingStack.toLocaleString()} stack ·{" "}
                    {blindLevelDuration} min levels · {blindPace.toUpperCase()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-300">Players</p>
                  <p className="text-sm text-gray-100">
                    Up to {maxPlayers} players · Late reg {lateRegMinutes} min
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-300">Payouts</p>
                  <p className="text-sm text-gray-100">
                    {payoutType === "topHeavy" && "Top-heavy (winner focused)"}
                    {payoutType === "flat" && "Flatter (more paid places)"}
                    {payoutType === "satellite" &&
                      "Satellite style (tickets / seats)"}
                    , {minPayoutPlaces}+ paid places
                  </p>
                  {guaranteedPrizePool > 0 && (
                    <p className="text-xs text-gray-400">
                      Guaranteed: {guaranteedPrizePool.toLocaleString()}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-300">Bounty / Bonuses</p>
                  <p className="text-sm text-gray-100">
                    {isBounty ? `Bounty: ${bountyAmount}` : "No bounties"}
                    {hasFinalTableBonus &&
                      ` · Final table bonus: ${finalTableBonus.toLocaleString()}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-300">Timing</p>
                  <p className="text-sm text-gray-100">
                    ~{totalDurationMinutes} min of levels (excluding breaks)
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-300">Estimated Tables</p>
                  <p className="text-sm text-gray-100">
                    ~{estimatedTables} tables · {tableSize} seats each
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Based on max players / table size.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-full bg-red-600 hover:bg-red-500 font-semibold shadow-[0_0_30px_rgba(248,113,113,0.9)] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating on-chain..." : "Create Tournament"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

type ToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <div className="space-y-1">
      <p className="font-medium">{label}</p>
      {description && (
        <p className="text-xs text-gray-300 max-w-xs">{description}</p>
      )}
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.checked)
        }
      />
      <span className="w-11 h-6 bg-black/60 rounded-full border border-red-500/60 flex items-center px-1 transition">
        <span
          className={
            "w-4 h-4 rounded-full transition-transform " +
            (checked
              ? "translate-x-4 bg-red-500"
              : "translate-x-0 bg-gray-500")
          }
        />
      </span>
    </label>
  </div>
);

export default CreateTournamentPage;
