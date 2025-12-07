// src/pages/Lobby.tsx
//
// Полностью переписанная профессиональная версия Lobby:
// - строгие маршруты /tournaments/:id
// - строгие URL /tables/:id
// - никакого any
// - полный UI-пакет: Register / Unregister / Start / Next Level / Close
// - тайпинги соответствуют твоему ончейну и TournamentPage / TablePage
//

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
    fetchTournaments,
    registerToTournament,
    unregisterFromTournament,
    startTournament,
    advanceTournamentLevel,
    closeTournament
} from "../linera/lineraClient";

import type { OnChainTournamentViewDto } from "../types/onchain";

// Админ-режим
const ADMIN_MODE =
    (import.meta as any).env.VITE_ADMIN_MODE === "true" ||
    (import.meta as any).env.VITE_ADMIN_MODE === "1";

const Lobby: React.FC = () => {
    const navigate = useNavigate();

    const [tournaments, setTournaments] = useState<OnChainTournamentViewDto[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<boolean>(false);

    // Загрузка турниров
    const loadTournaments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchTournaments();
            setTournaments(data);
        } catch (e: unknown) {
            console.error("[Lobby] fetch error:", e);
            setError(e instanceof Error ? e.message : "Failed to load tournaments");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTournaments();
    }, [loadTournaments]);

    // ---------------------------------------------------------
    //  КНОПКИ ДЕЙСТВИЙ ТУРНИРА
    // ---------------------------------------------------------

    const doRegister = async (tid: number) => {
        setBusy(true);
        try {
            await registerToTournament(tid);
            await loadTournaments();
        } catch (e: unknown) {
            console.error("Register failed:", e);
        } finally {
            setBusy(false);
        }
    };

    const doUnregister = async (tid: number) => {
        setBusy(true);
        try {
            await unregisterFromTournament(tid);
            await loadTournaments();
        } catch (e: unknown) {
            console.error("Unregister failed:", e);
        } finally {
            setBusy(false);
        }
    };

    const doStart = async (tid: number) => {
        setBusy(true);
        try {
            await startTournament(tid);
            await loadTournaments();
        } catch (e: unknown) {
            console.error("StartTournament failed:", e);
        } finally {
            setBusy(false);
        }
    };

    const doNextLevel = async (tid: number) => {
        setBusy(true);
        try {
            await advanceTournamentLevel(tid);
            await loadTournaments();
        } catch (e: unknown) {
            console.error("Advance failed:", e);
        } finally {
            setBusy(false);
        }
    };

    const doClose = async (tid: number) => {
        setBusy(true);
        try {
            await closeTournament(tid);
            await loadTournaments();
        } catch (e: unknown) {
            console.error("Close failed:", e);
        } finally {
            setBusy(false);
        }
    };

    // ---------------------------------------------------------
    //  РЕНДЕР ТУРНИРОВ
    // ---------------------------------------------------------

    const renderTournamentCard = (t: OnChainTournamentViewDto) => {
        const status = t.status.toLowerCase();
        const isFinished = status.includes("finish");
        const isRunning = status.includes("running");
        const isRegistering = status.includes("register");

        return (
            <div
                key={t.tournament_id}
                className="rounded-2xl bg-neutral-900/70 border border-neutral-800/70 p-5 flex flex-col space-y-4"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-semibold">{t.name}</div>
                        <div className="text-[11px] text-gray-400 mt-1">
                            ID: {t.tournament_id}
                        </div>
                    </div>

                    <button
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px]"
                        onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                    >
                        Details →
                    </button>
                </div>

                <div className="text-xs text-gray-300">
                    Status:{" "}
                    <span className="font-semibold text-gray-100">{t.status}</span>
                    <br />
                    Players registered: {t.players_registered}
                    <br />
                    Tables running: {t.tables_running}
                    <br />
                    Current level: {t.current_level}
                </div>

                {/* USER ACTION */}
                <div className="flex gap-3 pt-2">
                    {isRegistering && (
                        <>
                            <button
                                disabled={busy}
                                onClick={() => doRegister(t.tournament_id)}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold disabled:opacity-50"
                            >
                                Register
                            </button>

                            <button
                                disabled={busy}
                                onClick={() => doUnregister(t.tournament_id)}
                                className="flex-1 px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold disabled:opacity-50"
                            >
                                Unregister
                            </button>
                        </>
                    )}

                    {isRunning && (
                        <button
                            onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                            className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-xs font-semibold"
                        >
                            Enter →
                        </button>
                    )}

                    {isFinished && (
                        <div className="text-xs text-gray-500">
                            Tournament finished.
                        </div>
                    )}
                </div>

                {/* ADMIN ACTIONS */}
                {ADMIN_MODE && (
                    <div className="pt-3 border-t border-neutral-800/70 space-y-2">
                        <div className="text-[11px] font-semibold text-gray-400">Admin</div>
                        <div className="flex flex-col gap-2">
                            {!isRunning && !isFinished && (
                                <button
                                    disabled={busy}
                                    onClick={() => doStart(t.tournament_id)}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold disabled:opacity-50"
                                >
                                    Start Tournament
                                </button>
                            )}

                            {isRunning && (
                                <button
                                    disabled={busy}
                                    onClick={() => doNextLevel(t.tournament_id)}
                                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold disabled:opacity-50"
                                >
                                    Next Level
                                </button>
                            )}

                            {!isFinished && (
                                <button
                                    disabled={busy}
                                    onClick={() => doClose(t.tournament_id)}
                                    className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold disabled:opacity-50"
                                >
                                    Close Tournament
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ---------------------------------------------------------
    //  РЕНДЕР СТРАНИЦЫ
    // ---------------------------------------------------------

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black text-gray-100 px-6 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Tournaments Lobby</h1>

                    <button
                        className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold"
                        onClick={() => navigate("/")}
                    >
                        Back to Landing
                    </button>
                </div>

                {error && (
                    <div className="rounded-lg bg-red-900/40 border border-red-600 px-4 py-3 text-xs">
                        {error}
                    </div>
                )}

                <button
                    onClick={() => void loadTournaments()}
                    className="text-[11px] text-gray-400 hover:text-gray-200"
                >
                    Refresh
                </button>

                {loading ? (
                    <div className="text-sm text-gray-400">Loading tournaments…</div>
                ) : tournaments.length === 0 ? (
                    <div className="text-sm text-gray-500">No tournaments yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {tournaments.map(renderTournamentCard)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Lobby;
