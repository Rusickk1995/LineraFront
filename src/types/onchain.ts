// src/types/onchain.ts
//
// Типы, соответствующие Rust DTO:
//
// - Card (domain::card::Card)
// - PlayerAtTableDto
// - TableViewDto
// - TournamentViewDto
//
// Эти типы — "истина" для данных, приходящих с Linera on-chain.

/// Карта из Rust (domain::card::Card).
/// В Rust у тебя Rank/Suit – enum'ы, которые через serde попадают в JSON строками.
export interface OnChainCard {
  rank: string; // например: "Two" | "Ten" | "Ace"
  suit: string; // например: "Clubs" | "Diamonds" | "Hearts" | "Spades"
}

/// Игрок за столом (PlayerAtTableDto из poker_engine::api::dto).
export interface OnChainPlayerAtTableDto {
  player_id: number;
  display_name: string;
  seat_index: number;      // 0..N-1
  stack: number;           // Chips -> number в JSON
  current_bet: number;     // Chips -> number в JSON
  status: string;          // PlayerStatus сериализуется в строку
  hole_cards?: OnChainCard[] | null;
}

/// Стол (TableViewDto из poker_engine::api::dto).
export interface OnChainTableViewDto {
  table_id: string;
  name: string;
  max_seats: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  street: string;                 // "PreFlop" | "Flop" | "Turn" | "River" | "Showdown" | "Waiting"
  dealer_button: number | null;   // seat_index дилера
  total_pot: number;
  board: OnChainCard[];           // общие карты
  players: OnChainPlayerAtTableDto[];
  hand_in_progress: boolean;
  current_actor_seat: number | null; // seat_index текущего игрока
}

/// Турнир (TournamentViewDto из poker_engine::api::dto).
export interface OnChainTournamentViewDto {
  tournament_id: number;
  name: string;
  status: string;           // "Registering" | "Running" | "OnBreak" | "Finished"
  current_level: number;
  players_registered: number;
  tables_running: number;
}

/// При желании можно добавить тип для ответов CommandResponse
/// (если ты хочешь их разбирать напрямую на фронте).
/// Пока оставим как обобщённый JSON.
export type OnChainCommandResponse = any;