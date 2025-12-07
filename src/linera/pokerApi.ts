// src/linera/pokerApi.ts
//
// Poker GraphQL API поверх Linera Application.
// Здесь:
//  - GraphQL-транспорт (callServiceGraphQL)
//  - внутренние GQL-типы
//  - маппинги GQL -> OnChain DTO
//  - READ-операции (fetch*)
//  - МУТАЦИИ (create/start/advance/close, playerAction и т.д.)

import type {
  OnChainCard,
  OnChainPlayerAtTableDto,
  OnChainTableViewDto,
  OnChainTournamentViewDto,
} from "../types/onchain";
import type {
  AnteType,
  BlindLevel,
  TournamentConfig,
} from "../types/poker";
import { getBackend } from "./lineraWallet";

// ============================================================================
//      GraphQL-обёртка через backend.query(JSON.stringify({ query, variables }))
// ============================================================================

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: { message: string }[];
}

/**
 * Главная точка входа: отправка GraphQL-запроса в твой Poker service
 * через Linera Web client (без локального HTTP GraphQL).
 */
async function callServiceGraphQL<TData>(
  query: string,
  variables?: Record<string, unknown>
): Promise<TData> {
  const backend = await getBackend();

  // 1) Формируем payload { query, variables }
  const payload = { query, variables };

  // 2) ВАЖНО: отправляем СТРОКУ, потому что Query = String
  let raw: any;
  try {
    raw = await backend.query(JSON.stringify(payload));
  } catch (e: any) {
    console.error("[callServiceGraphQL] backend.query threw:", e);
    console.error("[callServiceGraphQL] error name =", e?.name);
    console.error("[callServiceGraphQL] error message =", e?.message);
    console.error(
      "[callServiceGraphQL] error constructor =",
      e && Object.getPrototypeOf(e)?.constructor?.name
    );
    throw e;
  }

  // 3) Разбираем ответ (это тоже строка JSON)
  let parsed: GraphQLResponse<TData>;
  try {
    parsed = JSON.parse(raw) as GraphQLResponse<TData>;
  } catch (e) {
    console.error("[callServiceGraphQL] Failed to parse response", raw);
    throw new Error("Invalid JSON from backend.query()");
  }

  if (parsed.errors && parsed.errors.length > 0) {
    const msg = parsed.errors.map((er) => er.message).join("; ");
    console.error("[callServiceGraphQL] GraphQL errors", parsed.errors);
    throw new Error(`Linera GraphQL error: ${msg}`);
  }

  if (!parsed.data) {
    throw new Error("Linera GraphQL error: missing `data` in response");
  }

  return parsed.data;
}

// ============================================================================
//              ВНУТРЕННИЕ GQL-типы (как в service.rs / GraphQL)
// ============================================================================

type GqlAnteType = "None" | "Classic" | "BigBlind";

type GqlPlayerActionKind =
  | "Fold"
  | "Check"
  | "Call"
  | "Bet"
  | "Raise"
  | "AllIn";

interface GqlCard {
  rank: string;
  suit: string;
}

interface GqlPlayerAtTable {
  playerId: number;
  displayName: string;
  seatIndex: number;
  stack: number;
  currentBet: number;
  status: string;
  holeCards?: GqlCard[] | null;
}

// ВАЖНО: в service.rs GqlTableView.table_id: String,
// значит здесь `tableId: string`, а не number.
interface GqlTableView {
  tableId: string;
  name: string;
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  street: string;
  dealerButton?: number | null;
  totalPot: number;
  board: GqlCard[];
  players: GqlPlayerAtTable[];
  handInProgress: boolean;
  currentActorSeat?: number | null;
}

interface GqlTournamentView {
  tournamentId: number;
  name: string;
  status: string;
  currentLevel: number;
  playersRegistered: number;
  tablesRunning: number;
}

interface GqlSummary {
  totalHandsPlayed: number;
  tablesCount: number;
  tournamentsCount: number;
}

export interface SummaryResponse {
  total_hands_played: number;
  tables_count: number;
  tournaments_count: number;
}

export interface MutationAck {
  ok: boolean;
  message: string;
}

// ============================================================================
//                  Хелперы для ACK (MutationAck)
// ============================================================================

/**
 * Нормализация произвольного ответа бэкенда к MutationAck.
 * Поддерживает:
 *  - { ok: bool, message?: string }
 *  - { success: bool, error?: string }
 *  - любые truthy / falsy значения в raw.ok.
 */
function normalizeAck(raw: any, context: string): MutationAck {
  if (!raw || typeof raw !== "object") {
    console.error(`[pokerApi] ${context} raw non-object ack:`, raw);
    return {
      ok: true,
      message: `${context}: backend returned non-object ack`,
    };
  }

  let ok: boolean;
  if (typeof raw.ok === "boolean") {
    ok = raw.ok;
  } else if (typeof raw.success === "boolean") {
    ok = raw.success;
  } else if (raw.ok != null) {
    ok = Boolean(raw.ok);
  } else if (raw.success != null) {
    ok = Boolean(raw.success);
  } else {
    ok = true;
  }

  let message = "";
  if (typeof raw.message === "string") {
    message = raw.message;
  } else if (typeof raw.error === "string") {
    message = raw.error;
  }

  return { ok, message };
}

/**
 * Достаёт ack из объекта ответа по нескольким возможным названиям полей.
 */
function extractAckFromResponse(
  data: any,
  fieldNames: string[],
  context: string
): MutationAck {
  // Если бэкенд вернул просто строку / число / null (как хэш операции),
  // считаем, что всё ок и не спамим ошибками.
  if (data === null || typeof data !== "object") {
    console.log(
      `[pokerApi] ${context}: non-object GraphQL data (treated as ok):`,
      data
    );
    return {
      ok: true,
      message: "",
    };
  }

  for (const field of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      return normalizeAck((data as any)[field], context);
    }
  }

  console.log(
    `[pokerApi] ${context}: ack field not found in data (treated as ok):`,
    data
  );
  return {
    ok: true,
    message: "",
  };
}

// ============================================================================
//           Маппинги GQL <-> твои DTO (snake_case формы)
// ============================================================================

function mapCard(g: GqlCard): OnChainCard {
  return { rank: g.rank, suit: g.suit };
}

function mapPlayer(g: GqlPlayerAtTable): OnChainPlayerAtTableDto {
  return {
    player_id: g.playerId,
    display_name: g.displayName,
    seat_index: g.seatIndex,
    stack: g.stack,
    current_bet: g.currentBet,
    status: g.status,
    hole_cards: g.holeCards ? g.holeCards.map(mapCard) : null,
  };
}

function mapTable(g: GqlTableView): OnChainTableViewDto {
  return {
    table_id: Number(g.tableId), // из String в number для твоего DTO
    name: g.name,
    max_seats: g.maxSeats,
    small_blind: g.smallBlind,
    big_blind: g.bigBlind,
    ante: g.ante,
    street: g.street,
    dealer_button: g.dealerButton ?? null,
    total_pot: g.totalPot,
    board: g.board.map(mapCard),
    players: g.players.map(mapPlayer),
    hand_in_progress: g.handInProgress,
    current_actor_seat: g.currentActorSeat ?? null,
  };
}

function mapTournament(g: GqlTournamentView): OnChainTournamentViewDto {
  return {
    tournament_id: g.tournamentId,
    name: g.name,
    status: g.status,
    current_level: g.currentLevel,
    players_registered: g.playersRegistered,
    tables_running: g.tablesRunning,
  };
}

function mapSummary(g: GqlSummary): SummaryResponse {
  return {
    total_hands_played: g.totalHandsPlayed,
    tables_count: g.tablesCount,
    tournaments_count: g.tournamentsCount,
  };
}

// ============================================================================
//                           READ-ONLY ЧАСТЬ
// ============================================================================

export async function fetchTable(
  tableId: number
): Promise<OnChainTableViewDto | null> {
  const query = `
    query FetchTable($tableId: String!) {
      table(tableId: $tableId) {
        tableId
        name
        maxSeats
        smallBlind
        bigBlind
        ante
        street
        dealerButton
        totalPot
        board { rank suit }
        players {
          playerId
          displayName
          seatIndex
          stack
          currentBet
          status
          holeCards { rank suit }
        }
        handInProgress
        currentActorSeat
      }
    }
  `;

  type Resp = { table: GqlTableView | null };

  const data = await callServiceGraphQL<Resp>(query, {
    tableId: String(tableId),
  });
  if (!data.table) return null;
  return mapTable(data.table);
}

export async function fetchTables(): Promise<OnChainTableViewDto[]> {
  const query = `
    query FetchTables {
      tables {
        tableId
        name
        maxSeats
        smallBlind
        bigBlind
        ante
        street
        dealerButton
        totalPot
        board { rank suit }
        players {
          playerId
          displayName
          seatIndex
          stack
          currentBet
          status
          holeCards { rank suit }
        }
        handInProgress
        currentActorSeat
      }
    }
  `;

  type Resp = { tables: GqlTableView[] };

  const data = await callServiceGraphQL<Resp>(query);
  return data.tables.map(mapTable);
}

export async function fetchTournaments(): Promise<OnChainTournamentViewDto[]> {
  const query = `
    query FetchTournaments {
      tournaments {
        tournamentId
        name
        status
        currentLevel
        playersRegistered
        tablesRunning
      }
    }
  `;

  type Resp = { tournaments: GqlTournamentView[] };

  const data = await callServiceGraphQL<Resp>(query);
  return data.tournaments.map(mapTournament);
}

export async function fetchTournament(
  tournamentId: number
): Promise<OnChainTournamentViewDto | null> {
  const query = `
    query FetchTournament($tournamentId: Int!) {
      tournamentById(tournamentId: $tournamentId) {
        tournamentId
        name
        status
        currentLevel
        playersRegistered
        tablesRunning
      }
    }
  `;

  type Resp = { tournamentById: GqlTournamentView | null };

  const data = await callServiceGraphQL<Resp>(query, { tournamentId });
  if (!data.tournamentById) return null;
  return mapTournament(data.tournamentById);
}

export async function fetchTournamentTables(
  tournamentId: number
): Promise<OnChainTableViewDto[]> {
  const query = `
    query FetchTournamentTables($tournamentId: Int!) {
      tournamentTables(tournamentId: $tournamentId) {
        tableId
        name
        maxSeats
        smallBlind
        bigBlind
        ante
        street
        dealerButton
        totalPot
        board { rank suit }
        players {
          playerId
          displayName
          seatIndex
          stack
          currentBet
          status
          holeCards { rank suit }
        }
        handInProgress
        currentActorSeat
      }
    }
  `;

  type Resp = { tournamentTables: GqlTableView[] };

  const data = await callServiceGraphQL<Resp>(query, { tournamentId });
  return data.tournamentTables.map(mapTable);
}

export async function fetchSummary(): Promise<SummaryResponse> {
  const query = `
    query FetchSummary {
      summary {
        totalHandsPlayed
        tablesCount
        tournamentsCount
      }
    }
  `;

  type Resp = { summary: GqlSummary };

  const data = await callServiceGraphQL<Resp>(query);
  return mapSummary(data.summary);
}

// ============================================================================
//                           МУТАЦИИ (contract commands)
// ============================================================================

export async function createTable(params: {
  tableId: number;
  name: string;
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  anteType: GqlAnteType;
}): Promise<MutationAck> {
  const query = `
    mutation CreateTable(
      $tableId: String!,
      $name: String!,
      $maxSeats: Int!,
      $smallBlind: Int!,
      $bigBlind: Int!,
      $ante: Int!,
      $anteType: GqlAnteType!
    ) {
      createTable(
        tableId: $tableId,
        name: $name,
        maxSeats: $maxSeats,
        smallBlind: $smallBlind,
        bigBlind: $bigBlind,
        ante: $ante,
        anteType: $anteType
      ) {
        ok
        message
      }
    }
  `;

  type Resp = {
    createTable?: any;
    create_table?: any;
  };

  const variables = {
    ...params,
    tableId: String(params.tableId),
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["createTable", "create_table"],
    "createTable"
  );
}

export async function seatPlayer(params: {
  tableId: number;
  playerId: number;
  seatIndex: number;
  displayName: string;
  initialStack: number;
}): Promise<MutationAck> {
  const query = `
    mutation SeatPlayer(
      $tableId: String!,
      $playerId: Int!,
      $seatIndex: Int!,
      $displayName: String!,
      $initialStack: Int!
    ) {
      seatPlayer(
        tableId: $tableId,
        playerId: $playerId,
        seatIndex: $seatIndex,
        displayName: $displayName,
        initialStack: $initialStack
      ) {
        ok
        message
      }
    }
  `;

  type Resp = {
    seatPlayer?: any;
    seat_player?: any;
  };

  const variables = {
    ...params,
    tableId: String(params.tableId),
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["seatPlayer", "seat_player"],
    "seatPlayer"
  );
}

export async function unseatPlayer(params: {
  tableId: number;
  seatIndex: number;
}): Promise<MutationAck> {
  const query = `
    mutation UnseatPlayer($tableId: String!, $seatIndex: Int!) {
      unseatPlayer(tableId: $tableId, seatIndex: $seatIndex) {
        ok
        message
      }
    }
  `;

  type Resp = {
    unseatPlayer?: any;
    unseat_player?: any;
  };

  const variables = {
    ...params,
    tableId: String(params.tableId),
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["unseatPlayer", "unseat_player"],
    "unseatPlayer"
  );
}

export async function adjustStack(params: {
  tableId: number;
  seatIndex: number;
  delta: number;
}): Promise<MutationAck> {
  const query = `
    mutation AdjustStack($tableId: String!, $seatIndex: Int!, $delta: Int!) {
      adjustStack(tableId: $tableId, seatIndex: $seatIndex, delta: $delta) {
        ok
        message
      }
    }
  `;

  type Resp = {
    adjustStack?: any;
    adjust_stack?: any;
  };

  const variables = {
    ...params,
    tableId: String(params.tableId),
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["adjustStack", "adjust_stack"],
    "adjustStack"
  );
}

export async function startHand(params: {
  tableId: number;
  handId: number;
}): Promise<MutationAck> {
  const query = `
    mutation StartHand($tableId: String!, $handId: Int!) {
      startHand(tableId: $tableId, handId: $handId) {
        ok
        message
      }
    }
  `;

  type Resp = {
    startHand?: any;
    start_hand?: any;
  };

  const variables = {
    ...params,
    tableId: String(params.tableId),
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["startHand", "start_hand"],
    "startHand"
  );
}

// UI action тип (экспортируем для TablePage)
export type PlayerActionKindUi =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all_in";

function mapUiActionToGql(kind: PlayerActionKindUi): GqlPlayerActionKind {
  switch (kind) {
    case "fold":
      return "Fold";
    case "check":
      return "Check";
    case "call":
      return "Call";
    case "bet":
      return "Bet";
    case "raise":
      return "Raise";
    case "all_in":
      return "AllIn";
  }
}

export async function playerAction(params: {
  tableId: number;
  action: PlayerActionKindUi;
  amount?: number;
}): Promise<MutationAck> {
  const query = `
    mutation PlayerAction(
      $tableId: String!,
      $action: GqlPlayerActionKind!,
      $amount: Int
    ) {
      playerAction(tableId: $tableId, action: $action, amount: $amount) {
        ok
        message
      }
    }
  `;

  const variables = {
    tableId: String(params.tableId),
    action: mapUiActionToGql(params.action),
    amount: params.amount ?? null,
  };

  type Resp = {
    playerAction?: any;
    player_action?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["playerAction", "player_action"],
    "playerAction"
  );
}

export async function tickTable(params: {
  tableId: number;
  deltaSecs: number;
}): Promise<MutationAck> {
  const query = `
    mutation TickTable($tableId: String!, $deltaSecs: Int!) {
      tickTable(tableId: $tableId, deltaSecs: $deltaSecs) {
        ok
        message
      }
    }
  `;

  type Resp = {
    tickTable?: any;
    tick_table?: any;
  };

  const variables = {
    ...params,
    tableId: String(params.tableId),
  };

  const data = await callServiceGraphQL<Resp>(query, variables);
  return extractAckFromResponse(
    data,
    ["tickTable", "tick_table"],
    "tickTable"
  );
}

// ============================================================================
//                       ТУРНИРНЫЕ МУТАЦИИ (низкий уровень)
// ============================================================================

type WireAnteType = "None" | "Classic" | "BigBlind";

interface WireBlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  ante_type: WireAnteType;
  duration_minutes: number;
}

interface WireBlindStructure {
  levels: WireBlindLevel[];
}

interface WireSchedule {
  scheduled_start_ts: number;
  allow_start_earlier: boolean;
  break_every_minutes: number;
  break_duration_minutes: number;
}

interface WireBalancing {
  enabled: boolean;
  max_seat_diff: number;
}

interface WireTournamentConfig {
  name: string;
  description: string | null;
  starting_stack: number;
  max_players: number;
  min_players_to_start: number;
  table_size: number;

  freezeout: boolean;
  reentry_allowed: boolean;
  max_entries_per_player: number;
  late_reg_level: number;

  blind_structure: WireBlindStructure;

  auto_approve: boolean;

  schedule: WireSchedule;
  balancing: WireBalancing;
}

function mapAnteTypeToWire(ante: AnteType): WireAnteType {
  switch (ante) {
    case "none":
      return "None";
    case "ante":
      return "Classic";
    case "bba":
      return "BigBlind";
  }
}

function mapUiTournamentConfigToWire(
  config: TournamentConfig
): WireTournamentConfig {
  const cfgWithOptional = config as TournamentConfig & {
    minPlayersToStart?: number;
    maxEntriesPerPlayer?: number;
  };

  const minPlayersToStart =
    cfgWithOptional.minPlayersToStart ?? config.tableSize ?? 2;

  const freezeout = !config.reEntryAllowed && !config.rebuysAllowed;

  const maxEntriesPerPlayer =
    cfgWithOptional.maxEntriesPerPlayer ?? (freezeout ? 1 : 3);

  let lateRegLevel = 0;
  if (config.lateRegMinutes > 0 && config.blindLevelDuration > 0) {
    const raw = config.lateRegMinutes / config.blindLevelDuration;
    lateRegLevel = Math.max(1, Math.ceil(raw));
  }

  const anteTypeWire = mapAnteTypeToWire(config.anteType);
  const durationPerLevel = config.blindLevelDuration;

  const wireBlindLevels: WireBlindLevel[] = config.blindLevels.map(
    (lvl: BlindLevel): WireBlindLevel => ({
      level: lvl.level,
      small_blind: lvl.smallBlind,
      big_blind: lvl.bigBlind,
      ante: lvl.ante,
      ante_type: anteTypeWire,
      duration_minutes: durationPerLevel,
    })
  );

  const blindStructure: WireBlindStructure = {
    levels: wireBlindLevels,
  };

  const schedule: WireSchedule = {
    scheduled_start_ts: 0,
    allow_start_earlier: true,
    break_every_minutes: config.breakEveryMinutes || 60,
    break_duration_minutes: config.breakDurationMinutes || 5,
  };

  const balancing: WireBalancing = {
    enabled: true,
    max_seat_diff: 1,
  };

  const description =
    config.description && config.description.trim().length > 0
      ? config.description
      : null;

  return {
    name: config.name,
    description,
    starting_stack: config.startingStack,
    max_players: config.maxPlayers,
    min_players_to_start: minPlayersToStart,
    table_size: config.tableSize,

    freezeout,
    reentry_allowed: config.reEntryAllowed,
    max_entries_per_player: maxEntriesPerPlayer,
    late_reg_level: lateRegLevel,

    blind_structure: blindStructure,

    auto_approve: config.instantRegistration,

    schedule,
    balancing,
  };
}

async function createTournamentMutation(params: {
  tournamentId: number;
  config: TournamentConfig;
}): Promise<MutationAck> {
  const query = `
    mutation CreateTournament($tournamentId: Int!, $config: Json!) {
      createTournament(tournamentId: $tournamentId, config: $config) {
        ok
        message
      }
    }
  `;

  const wireConfig = mapUiTournamentConfigToWire(params.config);

  type Resp = {
    createTournament?: any;
    create_tournament?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, {
    tournamentId: params.tournamentId,
    config: wireConfig,
  });

  return extractAckFromResponse(
    data,
    ["createTournament", "create_tournament"],
    "createTournament"
  );
}

async function registerPlayerToTournamentMutation(params: {
  tournamentId: number;
  playerId: number;
  displayName: string;
}): Promise<MutationAck> {
  const query = `
    mutation RegisterPlayerToTournament(
      $tournamentId: Int!,
      $playerId: Int!,
      $displayName: String!
    ) {
      registerPlayerToTournament(
        tournamentId: $tournamentId,
        playerId: $playerId,
        displayName: $displayName
      ) {
        ok
        message
      }
    }
  `;

  type Resp = {
    registerPlayerToTournament?: any;
    register_player_to_tournament?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, params);

  return extractAckFromResponse(
    data,
    ["registerPlayerToTournament", "register_player_to_tournament"],
    "registerPlayerToTournament"
  );
}

async function unregisterPlayerFromTournamentMutation(params: {
  tournamentId: number;
  playerId: number;
}): Promise<MutationAck> {
  const query = `
    mutation UnregisterPlayerFromTournament(
      $tournamentId: Int!,
      $playerId: Int!
    ) {
      unregisterPlayerFromTournament(
        tournamentId: $tournamentId,
        playerId: $playerId
      ) {
        ok
        message
      }
    }
  `;

  type Resp = {
    unregisterPlayerFromTournament?: any;
    unregister_player_from_tournament?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, params);

  return extractAckFromResponse(
    data,
    ["unregisterPlayerFromTournament", "unregister_player_from_tournament"],
    "unregisterPlayerFromTournament"
  );
}

export async function startTournamentMutation(params: {
  tournamentId: number;
}): Promise<MutationAck> {
  const query = `
    mutation StartTournament($tournamentId: Int!) {
      startTournament(tournamentId: $tournamentId) {
        ok
        message
      }
    }
  `;

  type Resp = {
    startTournament?: any;
    start_tournament?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, params);

  return extractAckFromResponse(
    data,
    ["startTournament", "start_tournament"],
    "startTournament"
  );
}

export async function advanceTournamentLevelMutation(params: {
  tournamentId: number;
}): Promise<MutationAck> {
  const query = `
    mutation AdvanceTournamentLevel($tournamentId: Int!) {
      advanceTournamentLevel(tournamentId: $tournamentId) {
        ok
        message
      }
    }
  `;

  type Resp = {
    advanceTournamentLevel?: any;
    advance_tournament_level?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, params);

  return extractAckFromResponse(
    data,
    ["advanceTournamentLevel", "advance_tournament_level"],
    "advanceTournamentLevel"
  );
}

export async function closeTournamentMutation(params: {
  tournamentId: number;
}): Promise<MutationAck> {
  const query = `
    mutation CloseTournament($tournamentId: Int!) {
      closeTournament(tournamentId: $tournamentId) {
        ok
        message
      }
    }
  `;

  type Resp = {
    closeTournament?: any;
    close_tournament?: any;
  };

  const data = await callServiceGraphQL<Resp>(query, params);

  return extractAckFromResponse(
    data,
    ["closeTournament", "close_tournament"],
    "closeTournament"
  );
}

// ============================================================================
//                 LEGACY-ОБЁРТКИ (API как раньше для фронта)
// ============================================================================

export async function createTournament(
  config: TournamentConfig
): Promise<OnChainTournamentViewDto> {
  const tournamentId = Math.floor(Math.random() * 1_000_000_000);

  const ack = await createTournamentMutation({ tournamentId, config });
  if (!ack.ok) {
    throw new Error(ack.message || "CreateTournament failed");
  }

  const view = await fetchTournament(tournamentId);
  if (!view) {
    throw new Error("Tournament not found after createTournament");
  }
  return view;
}

export async function registerToTournament(
  tournamentId: number
): Promise<OnChainTournamentViewDto> {
  const ack = await registerPlayerToTournamentMutation({
    tournamentId,
    playerId: 1,
    displayName: "Player #1",
  });

  if (!ack.ok) {
    throw new Error(ack.message || "RegisterPlayer failed");
  }

  const view = await fetchTournament(tournamentId);
  if (!view) {
    throw new Error("Tournament not found after registerToTournament");
  }
  return view;
}

export async function unregisterFromTournament(
  tournamentId: number
): Promise<OnChainTournamentViewDto> {
  const ack = await unregisterPlayerFromTournamentMutation({
    tournamentId,
    playerId: 1,
  });

  if (!ack.ok) {
    throw new Error(ack.message || "UnregisterPlayer failed");
  }

  const view = await fetchTournament(tournamentId);
  if (!view) {
    throw new Error("Tournament not found after unregisterFromTournament");
  }
  return view;
}

export async function startTournament(
  tournamentId: number
): Promise<OnChainTournamentViewDto> {
  const ack = await startTournamentMutation({ tournamentId });
  if (!ack.ok) {
    throw new Error(ack.message || "StartTournament failed");
  }

  const view = await fetchTournament(tournamentId);
  if (!view) {
    throw new Error("Tournament not found after startTournament");
  }
  return view;
}

export async function advanceTournamentLevel(
  tournamentId: number
): Promise<OnChainTournamentViewDto> {
  const ack = await advanceTournamentLevelMutation({ tournamentId });
  if (!ack.ok) {
    throw new Error(ack.message || "AdvanceTournamentLevel failed");
  }

  const view = await fetchTournament(tournamentId);
  if (!view) {
    throw new Error("Tournament not found after advanceTournamentLevel");
  }
  return view;
}

export async function closeTournament(
  tournamentId: number
): Promise<OnChainTournamentViewDto> {
  const ack = await closeTournamentMutation({ tournamentId });
  if (!ack.ok) {
    throw new Error(ack.message || "CloseTournament failed");
  }

  const view = await fetchTournament(tournamentId);
  if (!view) {
    throw new Error("Tournament not found after closeTournament");
  }
  return view;
}

export async function sendPlayerAction(
  tableId: number,
  action: PlayerActionKindUi,
  amount?: number
): Promise<OnChainTableViewDto | null> {
  const ack = await playerAction({ tableId, action, amount });
  if (!ack.ok) {
    throw new Error(ack.message || "PlayerAction failed");
  }

  return fetchTable(tableId);
}
