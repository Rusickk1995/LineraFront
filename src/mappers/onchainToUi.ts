// src/mappers/onchainToUi.ts
//
// Задача: преобразовать "сырые" ончейн DTO (OnChain*)
// в удобные UI-типы из src/types/poker.ts.
//
// Фронт НЕ должен знать про внутреннюю структуру Rust,
// он опирается на Player / UICard / GameState / TournamentConfig и т.п.

import {
  OnChainCard,
  OnChainPlayerAtTableDto,
  OnChainTableViewDto,
  OnChainTournamentViewDto,
} from "../types/onchain";
import {
  UICard,
  UISuit,
  UIRank,
  Player,
  GameState,
} from "../types/poker";

// =====================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================

/**
 * Маппинг масти из Rust ("Clubs", "Hearts" и т.п.) в UI-тип UISuit.
 */
export function mapSuit(suit: string): UISuit {
  switch (suit) {
    case "Clubs":
      return "clubs";
    case "Diamonds":
      return "diamonds";
    case "Hearts":
      return "hearts";
    case "Spades":
      return "spades";
    default:
      // fallback — если вдруг формат поменяется
      return "spades";
  }
}

/**
 * Маппинг ранга из Rust ("Two", "Ten", "Ace") в UI-ранг ("2", "10", "A").
 */
export function mapRank(rank: string): UIRank {
  switch (rank) {
    case "Two":
      return "2";
    case "Three":
      return "3";
    case "Four":
      return "4";
    case "Five":
      return "5";
    case "Six":
      return "6";
    case "Seven":
      return "7";
    case "Eight":
      return "8";
    case "Nine":
      return "9";
    case "Ten":
      return "10";
    case "Jack":
      return "J";
    case "Queen":
      return "Q";
    case "King":
      return "K";
    case "Ace":
      return "A";
    default:
      // если формат поменяется — пусть будет туз
      return "A";
  }
}

/**
 * Card (Rust) -> UICard (фронт).
 * hole_cards для UI мы будем помечать hidden = true, если это не герой.
 */
export function mapCard(card: OnChainCard, hidden: boolean = false): UICard {
  return {
    suit: mapSuit(card.suit),
    rank: mapRank(card.rank),
    hidden,
  };
}

/**
 * Разбор статусa игрока из строки в набор флагов UI-игрока.
 */
function deriveStatusFlags(status: string): {
  isFolded?: boolean;
  isAllIn?: boolean;
} {
  const normalized = status.toLowerCase();

  return {
    isFolded: normalized.includes("fold"),
    isAllIn: normalized.includes("allin") || normalized.includes("all_in"),
  };
}

// =====================
// МАППИНГ ИГРОКОВ
// =====================

/**
 * Преобразование OnChainPlayerAtTableDto -> Player (UI-тип).
 */
export function mapPlayer(
  p: OnChainPlayerAtTableDto,
  dealerSeat: number | null,
  smallBlindSeat: number | null,
  bigBlindSeat: number | null,
  heroPlayerId?: number
): Player {
  const { isFolded, isAllIn } = deriveStatusFlags(p.status);

  const isHero = heroPlayerId !== undefined && p.player_id === heroPlayerId;

  const cards =
    p.hole_cards?.map((c: OnChainCard) => mapCard(c, !isHero)) ?? undefined;

  return {
    id: String(p.player_id),
    name: p.display_name,
    stack: p.stack,
    position: p.seat_index, // 0..N-1 вокруг стола

    cards,

    isDealer: dealerSeat !== null && p.seat_index === dealerSeat,
    isSmallBlind:
      smallBlindSeat !== null && p.seat_index === smallBlindSeat,
    isBigBlind: bigBlindSeat !== null && p.seat_index === bigBlindSeat,

    isFolded,
    isAllIn,
  };
}

// =====================
// МАППИНГ СТОЛА В UI
// =====================

/**
 * Расчёт "smallBlindSeat" и "bigBlindSeat".
 */
function computeBlindSeats(
  dealerSeat: number | null,
  players: OnChainPlayerAtTableDto[],
  maxSeats: number
): { smallBlindSeat: number | null; bigBlindSeat: number | null } {
  if (dealerSeat === null || players.length === 0) {
    return { smallBlindSeat: null, bigBlindSeat: null };
  }

  const seatsOccupied = new Set(players.map((p) => p.seat_index));
  const nextSeat = (s: number): number => (s + 1) % maxSeats;

  let sb: number | null = null;
  let bb: number | null = null;

  // ищем small blind
  let current = nextSeat(dealerSeat);
  for (let i = 0; i < maxSeats; i += 1) {
    if (seatsOccupied.has(current)) {
      sb = current;
      break;
    }
    current = nextSeat(current);
  }

  // ищем big blind
  if (sb !== null) {
    current = nextSeat(sb);
    for (let i = 0; i < maxSeats; i += 1) {
      if (seatsOccupied.has(current)) {
        bb = current;
        break;
      }
      current = nextSeat(current);
    }
  }

  return { smallBlindSeat: sb, bigBlindSeat: bb };
}

/**
 * Преобразование OnChainTableViewDto -> UI-структуры:
 * - players: Player[]
 * - communityCards: UICard[]
 * - gameState: GameState
 */
export function mapTableToUi(
  table: OnChainTableViewDto,
  heroPlayerId?: number
): {
  players: Player[];
  communityCards: UICard[];
  gameState: GameState;
} {
  const dealerSeat = table.dealer_button;
  const { smallBlindSeat, bigBlindSeat } = computeBlindSeats(
    dealerSeat,
    table.players,
    table.max_seats
  );

  const players: Player[] = table.players.map((p: OnChainPlayerAtTableDto) =>
    mapPlayer(p, dealerSeat, smallBlindSeat, bigBlindSeat, heroPlayerId)
  );

  const communityCards: UICard[] = table.board.map((c: OnChainCard) =>
    mapCard(c, false)
  );

  const currentBet = table.players.reduce(
    (max: number, p: OnChainPlayerAtTableDto) =>
      p.current_bet > max ? p.current_bet : max,
    0
  );

  const minimumRaise = table.big_blind * 2;

  const currentPlayerId =
    table.current_actor_seat !== null
      ? String(
          table.players.find(
            (p: OnChainPlayerAtTableDto) =>
              p.seat_index === table.current_actor_seat
          )?.player_id ?? ""
        )
      : "";

  const gameState: GameState = {
    pot: table.total_pot,
    communityCards,
    currentBet,
    minimumRaise,
    boardTexture: table.street,
    currentPlayer: currentPlayerId,
    timeRemaining: 0,
  };

  return {
    players,
    communityCards,
    gameState,
  };
}

// Удобный тип результата маппера, чтобы не было any в TablePage.
export type UiTableFromOnchain = ReturnType<typeof mapTableToUi>;

// =====================
// МАППИНГ ТУРНИРА
// =====================

/**
 * Удобный маппер турнира для UI:
 * можешь расширить под нужды лобби.
 */
export function mapTournamentToUi(t: OnChainTournamentViewDto) {
  return {
    id: t.tournament_id,
    name: t.name,
    status: t.status,
    currentLevel: t.current_level,
    playersRegistered: t.players_registered,
    tablesRunning: t.tables_running,
  };
}
