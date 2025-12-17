// src/App.tsx

import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import CreateTournamentPage from "./pages/CreateTournamentPage";
import Lobby from "./pages/Lobby";
import TournamentPage from "./pages/TournamentPage";
import TablePage from "./pages/TablePage";

import { getBackend } from "./linera/lineraClient";
import { fetchSummary, fetchTournaments } from "./linera/pokerApi";


const App: React.FC = () => {
  useEffect(() => {
    // Инициализируем Linera backend (твой кошелёк + Conway client)
    getBackend().catch((e) => {
      console.error("[App] Failed to init Linera backend:", e);
    });
  }, []);

  useEffect(() => {
  getBackend()
    .then(async () => {
      console.log("[TEST] Linera backend ready");

      const s = await fetchSummary();
      console.log("[TEST] summary:", s);

      const t = await fetchTournaments();
      console.log("[TEST] tournaments:", t);
    })
    .catch((e) => {
      console.error("[TEST] init failed:", e);
    });
}, []);

  return (
    <Routes>
      {/* Лендинг */}
      <Route path="/" element={<LandingPage />} />

      {/* Создание турнира */}
      <Route path="/create" element={<CreateTournamentPage />} />

      {/* Лобби турниров */}
      <Route path="/lobby" element={<Lobby />} />

      {/* Страница одного турнира */}
      <Route path="/tournaments/:id" element={<TournamentPage />} />

      {/* Страница стола. tableId берём из URL-параметра */}
      <Route path="/tables/:tableId" element={<TablePage />} />

      {/* опциональный fallback, если нужен */}
      {/* <Route path="*" element={<LandingPage />} /> */}
    </Routes>
  );
};

export default App;
