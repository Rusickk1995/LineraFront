// src/linera/pokerApi.ts
import { gql } from "./lineraClient";

/**
 * У тебя GraphQL построен на async-graphql. В зависимости от настроек,
 * имена полей/аргументов могут быть либо snake_case (как в Rust),
 * либо camelCase. Поэтому для надёжности делаем fallback.
 */

function shouldRetryWithFallback(message: string): boolean {
  return (
    message.includes("Cannot query field") ||
    message.includes("Unknown argument") ||
    message.includes("Unknown type") ||
    message.includes("Unknown field") ||
    message.includes("Did you mean")
  );
}

async function gqlWithFallback<TData>(
  primary: string,
  fallback: string,
  variables?: Record<string, unknown>,
  operationName?: string
): Promise<TData> {
  try {
    return await gql<TData>(primary, variables, operationName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!fallback || !shouldRetryWithFallback(msg)) throw e;
    return await gql<TData>(fallback, variables, operationName);
  }
}

// -----------------------------------------------------------------------------
// Types matching service.rs GraphQL objects (Gql*)
// -----------------------------------------------------------------------------

export type TableId = string;
export type TournamentId = number;

export type GqlCard = {
  rank: string;
  suit: string;
};

export type GqlPlayerAtTable = {
  player_id: number;
  display_name: string;
  seat_index: number;
  stack: number;
  current_bet: number;
  status: string;
  hole_cards: GqlCard[] | null;
};

export type GqlTableView = {
  table_id: string;
  name: string;
  max_seats: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  street: string;
  dealer_button: number | null;
  total_pot: number;
  board: GqlCard[];
  players: GqlPlayerAtTable[];
  hand_in_progress: boolean;
  current_actor_seat: number | null;
};

export type GqlTournamentView = {
  tournament_id: number;
  name: string;
  status: string;
  current_level: number;
  players_registered: number;
  tables_running: number;
};

export type SummaryGql = {
  total_hands_played: number;
  tables_count: number;
  tournaments_count: number;
};

export type MutationAck = {
  ok: boolean;
  message: string;
};

// Enums exactly as in service.rs
export enum AnteType {
  None = "None",
  Classic = "Classic",
  BigBlind = "BigBlind",
}

export enum PlayerActionKind {
  Fold = "Fold",
  Check = "Check",
  Call = "Call",
  Bet = "Bet",
  Raise = "Raise",
  AllIn = "AllIn",
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export async function fetchSummary(): Promise<SummaryGql> {
  const q = `query { summary { total_hands_played tables_count tournaments_count } }`;
  // summary likely одинаково в обеих схемах, но держим единообразно
  return await gqlWithFallback<{ summary: SummaryGql }>(q, q).then((d) => d.summary);
}

export async function fetchTables(): Promise<GqlTableView[]> {
  const qSnake = `query { tables {
    table_id name max_seats small_blind big_blind ante street dealer_button total_pot
    board { rank suit }
    players { player_id display_name seat_index stack current_bet status hole_cards { rank suit } }
    hand_in_progress current_actor_seat
  } }`;

  const qCamel = `query { tables {
    tableId: table_id
    name
    maxSeats: max_seats
    smallBlind: small_blind
    bigBlind: big_blind
    ante
    street
    dealerButton: dealer_button
    totalPot: total_pot
    board { rank suit }
    players {
      playerId: player_id
      displayName: display_name
      seatIndex: seat_index
      stack
      currentBet: current_bet
      status
      holeCards: hole_cards { rank suit }
    }
    handInProgress: hand_in_progress
    currentActorSeat: current_actor_seat
  } }`;

  // Вариант camel использует алиасы, чтобы привести к твоей snake-структуре нельзя.
  // Поэтому делаем так: если сработал camel запрос — мы должны маппить вручную.
  // Но проще: используем fallback не на алиасы, а на реальные camel имена полей.
  // (Ниже второй запрос именно с camelCase полями без алиасов.)

  const qCamelReal = `query { tables {
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
  } }`;

  // Пытаемся snake first, потом camel-real
  const data = await gqlWithFallback<{ tables: GqlTableView[] }>(qSnake, qCamelReal);
  return data.tables;
}

export async function fetchTable(tableId: TableId): Promise<GqlTableView | null> {
  const qSnake = `query($tableId: String!) {
    table(table_id: $tableId) {
      table_id name max_seats small_blind big_blind ante street dealer_button total_pot
      board { rank suit }
      players { player_id display_name seat_index stack current_bet status hole_cards { rank suit } }
      hand_in_progress current_actor_seat
    }
  }`;

  const qCamel = `query($tableId: String!) {
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
      players { playerId displayName seatIndex stack currentBet status holeCards { rank suit } }
      handInProgress
      currentActorSeat
    }
  }`;

  const data = await gqlWithFallback<{ table: GqlTableView | null }>(
    qSnake,
    qCamel,
    { tableId }
  );
  return data.table;
}

export async function fetchTournaments(): Promise<GqlTournamentView[]> {
  const qSnake = `query { tournaments {
    tournament_id name status current_level players_registered tables_running
  } }`;

  const qCamel = `query { tournaments {
    tournamentId
    name
    status
    currentLevel
    playersRegistered
    tablesRunning
  } }`;

  const data = await gqlWithFallback<{ tournaments: GqlTournamentView[] }>(qSnake, qCamel);
  return data.tournaments;
}

export async function fetchTournament(tournamentId: TournamentId): Promise<GqlTournamentView | null> {
  const qSnake = `query($id: Int!) {
    tournament_by_id(tournament_id: $id) {
      tournament_id name status current_level players_registered tables_running
    }
  }`;

  const qCamel = `query($id: Int!) {
    tournamentById(tournamentId: $id) {
      tournamentId
      name
      status
      currentLevel
      playersRegistered
      tablesRunning
    }
  }`;

  const data = await gqlWithFallback<{ tournament_by_id: GqlTournamentView | null; tournamentById?: GqlTournamentView | null }>(
    qSnake,
    qCamel,
    { id: tournamentId }
  );

  // В зависимости от того, какой запрос отработал, поле будет разное
  return (data as { tournament_by_id?: GqlTournamentView | null; tournamentById?: GqlTournamentView | null }).tournament_by_id
    ?? (data as { tournamentById?: GqlTournamentView | null }).tournamentById
    ?? null;
}

export async function fetchTournamentTables(tournamentId: TournamentId): Promise<GqlTableView[]> {
  const qSnake = `query($id: Int!) {
    tournament_tables(tournament_id: $id) {
      table_id name max_seats small_blind big_blind ante street dealer_button total_pot
      board { rank suit }
      players { player_id display_name seat_index stack current_bet status hole_cards { rank suit } }
      hand_in_progress current_actor_seat
    }
  }`;

  const qCamel = `query($id: Int!) {
    tournamentTables(tournamentId: $id) {
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
      players { playerId displayName seatIndex stack currentBet status holeCards { rank suit } }
      handInProgress
      currentActorSeat
    }
  }`;

  const data = await gqlWithFallback<
    { tournament_tables: GqlTableView[]; tournamentTables?: GqlTableView[] }
  >(qSnake, qCamel, { id: tournamentId });

  return (
    (data as { tournament_tables?: GqlTableView[] }).tournament_tables ??
    (data as { tournamentTables?: GqlTableView[] }).tournamentTables ??
    []
  );
}

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export async function createTable(input: {
  tableId: TableId;
  name: string;
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  anteType: AnteType;
}): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $name: String!, $maxSeats: Int!, $sb: Int!, $bb: Int!, $ante: Int!, $anteType: GqlAnteType!) {
    create_table(
      table_id: $tableId,
      name: $name,
      max_seats: $maxSeats,
      small_blind: $sb,
      big_blind: $bb,
      ante: $ante,
      ante_type: $anteType
    ) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $name: String!, $maxSeats: Int!, $sb: Int!, $bb: Int!, $ante: Int!, $anteType: GqlAnteType!) {
    createTable(
      tableId: $tableId,
      name: $name,
      maxSeats: $maxSeats,
      smallBlind: $sb,
      bigBlind: $bb,
      ante: $ante,
      anteType: $anteType
    ) { ok message }
  }`;

  const vars = {
    tableId: input.tableId,
    name: input.name,
    maxSeats: input.maxSeats,
    sb: input.smallBlind,
    bb: input.bigBlind,
    ante: input.ante,
    anteType: input.anteType,
  };

  const data = await gqlWithFallback<{ create_table: MutationAck; createTable?: MutationAck }>(
    mSnake,
    mCamel,
    vars
  );

  return (
    (data as { create_table?: MutationAck }).create_table ??
    (data as { createTable?: MutationAck }).createTable ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function seatPlayer(input: {
  tableId: TableId;
  playerId: number;
  seatIndex: number;
  displayName: string;
  initialStack: number;
}): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $playerId: Int!, $seatIndex: Int!, $displayName: String!, $initialStack: Int!) {
    seat_player(
      table_id: $tableId,
      player_id: $playerId,
      seat_index: $seatIndex,
      display_name: $displayName,
      initial_stack: $initialStack
    ) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $playerId: Int!, $seatIndex: Int!, $displayName: String!, $initialStack: Int!) {
    seatPlayer(
      tableId: $tableId,
      playerId: $playerId,
      seatIndex: $seatIndex,
      displayName: $displayName,
      initialStack: $initialStack
    ) { ok message }
  }`;

  const vars = {
    tableId: input.tableId,
    playerId: input.playerId,
    seatIndex: input.seatIndex,
    displayName: input.displayName,
    initialStack: input.initialStack,
  };

  const data = await gqlWithFallback<{ seat_player: MutationAck; seatPlayer?: MutationAck }>(
    mSnake,
    mCamel,
    vars
  );

  return (
    (data as { seat_player?: MutationAck }).seat_player ??
    (data as { seatPlayer?: MutationAck }).seatPlayer ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function unseatPlayer(tableId: TableId, seatIndex: number): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $seatIndex: Int!) {
    unseat_player(table_id: $tableId, seat_index: $seatIndex) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $seatIndex: Int!) {
    unseatPlayer(tableId: $tableId, seatIndex: $seatIndex) { ok message }
  }`;

  const data = await gqlWithFallback<{ unseat_player: MutationAck; unseatPlayer?: MutationAck }>(
    mSnake,
    mCamel,
    { tableId, seatIndex }
  );

  return (
    (data as { unseat_player?: MutationAck }).unseat_player ??
    (data as { unseatPlayer?: MutationAck }).unseatPlayer ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function adjustStack(tableId: TableId, seatIndex: number, delta: number): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $seatIndex: Int!, $delta: Int!) {
    adjust_stack(table_id: $tableId, seat_index: $seatIndex, delta: $delta) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $seatIndex: Int!, $delta: Int!) {
    adjustStack(tableId: $tableId, seatIndex: $seatIndex, delta: $delta) { ok message }
  }`;

  const data = await gqlWithFallback<{ adjust_stack: MutationAck; adjustStack?: MutationAck }>(
    mSnake,
    mCamel,
    { tableId, seatIndex, delta }
  );

  return (
    (data as { adjust_stack?: MutationAck }).adjust_stack ??
    (data as { adjustStack?: MutationAck }).adjustStack ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function startHand(tableId: TableId, handId: number): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $handId: Int!) {
    start_hand(table_id: $tableId, hand_id: $handId) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $handId: Int!) {
    startHand(tableId: $tableId, handId: $handId) { ok message }
  }`;

  const data = await gqlWithFallback<{ start_hand: MutationAck; startHand?: MutationAck }>(
    mSnake,
    mCamel,
    { tableId, handId }
  );

  return (
    (data as { start_hand?: MutationAck }).start_hand ??
    (data as { startHand?: MutationAck }).startHand ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function playerAction(tableId: TableId, action: PlayerActionKind, amount?: number): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $action: GqlPlayerActionKind!, $amount: Int) {
    player_action(table_id: $tableId, action: $action, amount: $amount) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $action: GqlPlayerActionKind!, $amount: Int) {
    playerAction(tableId: $tableId, action: $action, amount: $amount) { ok message }
  }`;

  const vars: Record<string, unknown> = { tableId, action, amount: amount ?? null };

  const data = await gqlWithFallback<{ player_action: MutationAck; playerAction?: MutationAck }>(
    mSnake,
    mCamel,
    vars
  );

  return (
    (data as { player_action?: MutationAck }).player_action ??
    (data as { playerAction?: MutationAck }).playerAction ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function tickTable(tableId: TableId, deltaSecs: number): Promise<MutationAck> {
  const mSnake = `mutation($tableId: String!, $delta: Int!) {
    tick_table(table_id: $tableId, delta_secs: $delta) { ok message }
  }`;

  const mCamel = `mutation($tableId: String!, $delta: Int!) {
    tickTable(tableId: $tableId, deltaSecs: $delta) { ok message }
  }`;

  const data = await gqlWithFallback<{ tick_table: MutationAck; tickTable?: MutationAck }>(
    mSnake,
    mCamel,
    { tableId, delta: deltaSecs }
  );

  return (
    (data as { tick_table?: MutationAck }).tick_table ??
    (data as { tickTable?: MutationAck }).tickTable ??
    { ok: false, message: "Unknown mutation result" }
  );
}

// JSON scalar in async-graphql обычно называется JSON.
// config в service.rs: Json<TournamentConfig>
export type TournamentConfigJson = Record<string, unknown>;

export async function createTournament(tournamentId: TournamentId, config: TournamentConfigJson): Promise<MutationAck> {
  const mSnake = `mutation($id: Int!, $cfg: JSON!) {
    create_tournament(tournament_id: $id, config: $cfg) { ok message }
  }`;

  const mCamel = `mutation($id: Int!, $cfg: JSON!) {
    createTournament(tournamentId: $id, config: $cfg) { ok message }
  }`;

  const data = await gqlWithFallback<{ create_tournament: MutationAck; createTournament?: MutationAck }>(
    mSnake,
    mCamel,
    { id: tournamentId, cfg: config }
  );

  return (
    (data as { create_tournament?: MutationAck }).create_tournament ??
    (data as { createTournament?: MutationAck }).createTournament ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function registerPlayerToTournament(
  tournamentId: TournamentId,
  playerId: number,
  displayName: string
): Promise<MutationAck> {
  const mSnake = `mutation($tid: Int!, $pid: Int!, $name: String!) {
    register_player_to_tournament(tournament_id: $tid, player_id: $pid, display_name: $name) { ok message }
  }`;

  const mCamel = `mutation($tid: Int!, $pid: Int!, $name: String!) {
    registerPlayerToTournament(tournamentId: $tid, playerId: $pid, displayName: $name) { ok message }
  }`;

  const data = await gqlWithFallback<
    { register_player_to_tournament: MutationAck; registerPlayerToTournament?: MutationAck }
  >(mSnake, mCamel, { tid: tournamentId, pid: playerId, name: displayName });

  return (
    (data as { register_player_to_tournament?: MutationAck }).register_player_to_tournament ??
    (data as { registerPlayerToTournament?: MutationAck }).registerPlayerToTournament ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function unregisterPlayerFromTournament(
  tournamentId: TournamentId,
  playerId: number
): Promise<MutationAck> {
  const mSnake = `mutation($tid: Int!, $pid: Int!) {
    unregister_player_from_tournament(tournament_id: $tid, player_id: $pid) { ok message }
  }`;

  const mCamel = `mutation($tid: Int!, $pid: Int!) {
    unregisterPlayerFromTournament(tournamentId: $tid, playerId: $pid) { ok message }
  }`;

  const data = await gqlWithFallback<
    { unregister_player_from_tournament: MutationAck; unregisterPlayerFromTournament?: MutationAck }
  >(mSnake, mCamel, { tid: tournamentId, pid: playerId });

  return (
    (data as { unregister_player_from_tournament?: MutationAck }).unregister_player_from_tournament ??
    (data as { unregisterPlayerFromTournament?: MutationAck }).unregisterPlayerFromTournament ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function startTournament(tournamentId: TournamentId): Promise<MutationAck> {
  const mSnake = `mutation($tid: Int!) {
    start_tournament(tournament_id: $tid) { ok message }
  }`;

  const mCamel = `mutation($tid: Int!) {
    startTournament(tournamentId: $tid) { ok message }
  }`;

  const data = await gqlWithFallback<{ start_tournament: MutationAck; startTournament?: MutationAck }>(
    mSnake,
    mCamel,
    { tid: tournamentId }
  );

  return (
    (data as { start_tournament?: MutationAck }).start_tournament ??
    (data as { startTournament?: MutationAck }).startTournament ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function advanceTournamentLevel(tournamentId: TournamentId): Promise<MutationAck> {
  const mSnake = `mutation($tid: Int!) {
    advance_tournament_level(tournament_id: $tid) { ok message }
  }`;

  const mCamel = `mutation($tid: Int!) {
    advanceTournamentLevel(tournamentId: $tid) { ok message }
  }`;

  const data = await gqlWithFallback<
    { advance_tournament_level: MutationAck; advanceTournamentLevel?: MutationAck }
  >(mSnake, mCamel, { tid: tournamentId });

  return (
    (data as { advance_tournament_level?: MutationAck }).advance_tournament_level ??
    (data as { advanceTournamentLevel?: MutationAck }).advanceTournamentLevel ??
    { ok: false, message: "Unknown mutation result" }
  );
}

export async function closeTournament(tournamentId: TournamentId): Promise<MutationAck> {
  const mSnake = `mutation($tid: Int!) {
    close_tournament(tournament_id: $tid) { ok message }
  }`;

  const mCamel = `mutation($tid: Int!) {
    closeTournament(tournamentId: $tid) { ok message }
  }`;

  const data = await gqlWithFallback<{ close_tournament: MutationAck; closeTournament?: MutationAck }>(
    mSnake,
    mCamel,
    { tid: tournamentId }
  );

  return (
    (data as { close_tournament?: MutationAck }).close_tournament ??
    (data as { closeTournament?: MutationAck }).closeTournament ??
    { ok: false, message: "Unknown mutation result" }
  );
}

// -----------------------------------------------------------------------------
// Aliases to match your existing pages’ expectations (so you don’t rewrite imports)
// -----------------------------------------------------------------------------

export const sendPlayerAction = playerAction;
export const registerToTournament = registerPlayerToTournament;
export const unregisterFromTournament = unregisterPlayerFromTournament;
