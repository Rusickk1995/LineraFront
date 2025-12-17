// src/pages/TournamentPage.tsx
//
// Страница жизни одного турнира:
// - показывает детальную инфу по турниру;
// - даёт Register / Unregister;
// - в админ-режиме: Start / Next level / Close;
// - показывает связанные столы и даёт перейти на TablePage.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  advanceTournamentLevel,
  closeTournament,
  fetchTournament,
  fetchTournamentTables,
  registerToTournament,
  startTournament,
  unregisterFromTournament,
} from "../linera/lineraClient";
import type {
  OnChainTableViewDto,
  OnChainTournamentViewDto,
} from "../types/onchain";

// Флаг админ-режима (как в Lobby)
const ADMIN_MODE =
  (import.meta as any).env.VITE_ADMIN_MODE === "true" ||
  (import.meta as any).env.VITE_ADMIN_MODE === "1";

// Один и тот же “текущий игрок” для dev-теста.
// Реально у тебя идентика делается на ончейне по signer,
// но на фронте мы пока считаем, что мы Player #1.
const DEV_PLAYER_ID = 1;

const TournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const tournamentId = useMemo(() => Number(id), [id]);

  const [tournament, setTournament] =
    useState<OnChainTournamentViewDto | null>(null);
  const [tables, setTables] = useState<OnChainTableViewDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminAction, setIsAdminAction] = useState(false);

  // ---------------------------------------------------------------------------
  // Загрузка состояния турнира + столов
  // ---------------------------------------------------------------------------

  async function loadData() {
    if (!Number.isFinite(tournamentId)) {
      setError("Invalid tournament id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [t, ts] = await Promise.all([
        fetchTournament(tournamentId),
        fetchTournamentTables(tournamentId),
      ]);

      if (!t) {
        setError("Tournament not found");
        setTournament(null);
        setTables([]);
      } else {
        setTournament(t);
        setTables(ts);
      }
    } catch (e: unknown) {
      console.error("[TournamentPage] loadData error", e);
      setError(
        e instanceof Error ? e.message : "Failed to load tournament data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // ---------------------------------------------------------------------------
  // Регистрация / отмена
  // ---------------------------------------------------------------------------

  const handleRegister = async () => {
    if (!tournament) return;
    setIsRegistering(true);
    setError(null);

    try {
      // Сейчас в бекенд уходит player_id = 1,
      // а на ончейне он привязывается к signer.
      await registerToTournament(tournament.tournament_id);
      await loadData();
    } catch (e: unknown) {
      console.error("[TournamentPage] handleRegister error", e);
      setError(
        e instanceof Error ? e.message : "Failed to register to tournament"
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!tournament) return;
    setIsRegistering(true);
    setError(null);

    try {
      await unregisterFromTournament(tournament.tournament_id);
      await loadData();
    } catch (e: unknown) {
      console.error("[TournamentPage] handleUnregister error", e);
      setError(
        e instanceof Error ? e.message : "Failed to unregister from tournament"
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Админские действия (Start / Next level / Close)
  // ---------------------------------------------------------------------------

  const handleAdminAction = async (
    action: "start" | "advance" | "close"
  ) => {
    if (!tournament) return;
    setIsAdminAction(true);
    setError(null);

    try {
      if (action === "start") {
        await startTournament(tournament.tournament_id);
      } else if (action === "advance") {
        await advanceTournamentLevel(tournament.tournament_id);
      } else if (action === "close") {
        await closeTournament(tournament.tournament_id);
      }

      await loadData();
    } catch (e: unknown) {
      console.error("[TournamentPage] admin action error", action, e);
      setError(
        e instanceof Error ? e.message : `Failed to perform ${action} action`
      );
    } finally {
      setIsAdminAction(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Вспомогательные вычисления
  // ---------------------------------------------------------------------------

  const statusBadge = useMemo(() => {
    const status = tournament?.status ?? "";
    const normalized = status.toLowerCase();

    let bg = "bg-gray-700";
    if (normalized.includes("register")) bg = "bg-yellow-600";
    if (normalized.includes("running")) bg = "bg-green-600";
    if (normalized.includes("finish")) bg = "bg-red-700";

    return (
      <span className={`px-3 py-1 rounded-full text-xs uppercase ${bg}`}>
        {status}
      </span>
    );
  }, [tournament?.status]);

  // ---------------------------------------------------------------------------
  // Рендер
  // ---------------------------------------------------------------------------

  if (loading && !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-red-950 to-black text-gray-100">
        <div className="text-lg font-semibold">Loading tournament…</div>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-red-950 to-black text-gray-100">
        <div className="bg-red-900/40 border border-red-700 px-6 py-4 rounded-xl">
          <div className="text-sm font-semibold mb-2">Error</div>
          <div className="text-sm">{error}</div>
          <button
            className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-semibold"
            onClick={() => navigate("/lobby")}
          >
            Back to lobby
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black text-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-red-500/80">
              TOURNAMENT
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-semibold">{tournament.name}</h1>
              {statusBadge}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              ID: {tournament.tournament_id} · Current level:{" "}
              {tournament.current_level} · Players registered:{" "}
              {tournament.players_registered} · Tables running:{" "}
              {tournament.tables_running}
            </div>
          </div>

          <button
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold"
            onClick={() => navigate("/lobby")}
          >
            Back to lobby
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-xs text-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: основные действия */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/70 px-5 py-4">
              <div className="text-sm font-semibold mb-3">
                Registration
              </div>
              <div className="text-xs text-gray-400 mb-4">
                Player (dev) ID: {DEV_PLAYER_ID}
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleRegister}
                  disabled={isRegistering}
                >
                  {isRegistering ? "Processing…" : "Register"}
                </button>
                <button
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleUnregister}
                  disabled={isRegistering}
                >
                  {isRegistering ? "Processing…" : "Unregister"}
                </button>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                В прод-версии здесь будет связка с настоящим аккаунтом /
                кошельком. Сейчас мы тестируем турнир на фиксированном
                player_id = 1.
              </div>
            </div>

            {ADMIN_MODE && (
              <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/70 px-5 py-4">
                <div className="text-sm font-semibold mb-3">
                  Admin controls
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleAdminAction("start")}
                    disabled={isAdminAction}
                  >
                    {isAdminAction ? "Working…" : "Start tournament"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleAdminAction("advance")}
                    disabled={isAdminAction}
                  >
                    {isAdminAction ? "Working…" : "Next level"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleAdminAction("close")}
                    disabled={isAdminAction}
                  >
                    {isAdminAction ? "Working…" : "Close tournament"}
                  </button>
                </div>
                <div className="mt-3 text-[11px] text-gray-500">
                  Эти кнопки видишь только ты при включённом VITE_ADMIN_MODE.
                  Игрокам они никогда не показываются.
                </div>
              </div>
            )}
          </div>

          {/* Right: столы турнира */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/70 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">
                  Tournament tables
                </div>
                <button
                  className="text-[11px] text-gray-400 hover:text-gray-200"
                  onClick={() => void loadData()}
                >
                  Refresh
                </button>
              </div>

              {tables.length === 0 ? (
                <div className="text-xs text-gray-500">
                  Столы ещё не созданы. Они появляются после старта турнира.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tables.map((t) => (
                    <div
                      key={t.table_id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">
                          Table #{t.table_id}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {t.players.length}/{t.max_seats} players
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400 mb-2">
                        Blinds: {t.small_blind}/{t.big_blind} · Ante:{" "}
                        {t.ante} · Street: {t.street}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {t.players.map((p) => (
                          <div
                            key={p.player_id}
                            className="px-2 py-1 rounded-full bg-neutral-800 text-[11px]"
                          >
                            #{p.player_id} · {p.display_name} ·{" "}
                            {p.stack}
                          </div>
                        ))}
                        {t.players.length === 0 && (
                          <div className="text-[11px] text-gray-500">
                            No seated players yet
                          </div>
                        )}
                      </div>
                      <button
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-[11px] font-semibold"
                        onClick={() =>
                          navigate(`/tables/${t.table_id}`)
                        }
                      >
                        Go to table
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentPage;
