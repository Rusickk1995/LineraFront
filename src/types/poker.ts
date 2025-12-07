// src/types/poker.ts

// ====== Турнирные типы (для Landing/Create/TablePage) ======

export type AnteType = "none" | "ante" | "bba";
export type BlindPace = "slow" | "regular" | "turbo" | "hyper";

export type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
};

export type PayoutType = "topHeavy" | "flat" | "satellite";

// Конфиг турнира, который мы прокидываем из CreateTournamentPage -> TablePage
export type TournamentConfig = {
  // Базовая инфа
  name: string;
  description: string;
  prizeDescription: string;
  startTime: string; // ISO datetime либо пустая строка
  regCloseTime: string; // ISO datetime либо пустая строка

  // Структура
  tableSize: number; // 6 / 8 / 9
  actionTime: number; // сек на действие
  blindLevelDuration: number; // мин на уровень
  blindPace: BlindPace;

  // Стартовый стек и игроки
  startingStack: number;
  maxPlayers: number;
  lateRegMinutes: number;

  // Анте / блайнды
  anteType: AnteType;
  isProgressiveAnte: boolean;

  // Выплаты
  payoutType: PayoutType;
  minPayoutPlaces: number;
  guaranteedPrizePool: number;

  // Баунти / финальный стол
  isBounty: boolean;
  bountyAmount: number;
  hasFinalTableBonus: boolean;
  finalTableBonus: number;

  // Таймбанк / перерывы
  timeBankSeconds: number;
  breakEveryMinutes: number;
  breakDurationMinutes: number;

  // Регистрация / ре-энтри
  instantRegistration: boolean;
  reEntryAllowed: boolean;
  rebuysAllowed: boolean;

  // Сгенерированный список уровней
  blindLevels: BlindLevel[];
};

// ====== Простые типы для старых страниц и UI-таблицы ======

// Карта в “UI”-формате (Table.ts, PokerTable.ts и т.п.)
export type UISuit = "spades" | "hearts" | "diamonds" | "clubs";
export type UIRank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export type UICard = {
  suit: UISuit;
  rank: UIRank;
  hidden?: boolean;
};

// Игрок для простых демо-страниц (Home/Lobby/Table и т.п.)
export type Player = {
  id: string;
  name: string;
  stack: number;
  position: number; // 0..N-1 вокруг стола

  cards?: UICard[];

  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;

  isFolded?: boolean;
  isAllIn?: boolean;
};

// Глобальное состояние стола для демо-компонентов
export type GameState = {
  pot: number;
  communityCards: UICard[];
  currentBet: number;
  minimumRaise: number;
  boardTexture?: string;

  currentPlayer: string; // id игрока, который действует
  timeRemaining: number; // секунды
};
