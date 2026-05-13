import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const DB_PATH = join(DATA_DIR, "chess.db");

export class GameRepository {
  constructor() {
    mkdirSync(DATA_DIR, { recursive: true });
    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this._migrate();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at  TEXT    NOT NULL,
        ended_at    TEXT,
        mode        TEXT    NOT NULL,
        depth       INTEGER,
        result      TEXT,
        total_moves INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS game_moves (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id     INTEGER NOT NULL,
        move_number INTEGER NOT NULL,
        san         TEXT    NOT NULL,
        fen         TEXT    NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );
    `);
  }

  startGame(mode, depth = null) {
    const stmt = this.db.prepare(
      "INSERT INTO games (started_at, mode, depth) VALUES (?, ?, ?)",
    );
    const result = stmt.run(new Date().toISOString(), mode, depth);
    return result.lastInsertRowid;
  }

  saveMove(gameId, moveNumber, san, fen) {
    const stmt = this.db.prepare(
      "INSERT INTO game_moves (game_id, move_number, san, fen) VALUES (?, ?, ?, ?)",
    );
    stmt.run(gameId, moveNumber, san, fen);
  }

  finishGame(gameId, result, totalMoves) {
    const stmt = this.db.prepare(
      "UPDATE games SET ended_at = ?, result = ?, total_moves = ? WHERE id = ?",
    );
    stmt.run(new Date().toISOString(), result, totalMoves, gameId);
  }

  getStats() {
    const total = this.db
      .prepare("SELECT COUNT(*) AS total FROM games WHERE result IS NOT NULL")
      .get();
    const wins = this.db
      .prepare(
        "SELECT result, COUNT(*) AS qty FROM games WHERE result IS NOT NULL GROUP BY result",
      )
      .all();

    const map = {
      white: 0,
      black: 0,
      draw: 0,
      "resignation:white": 0,
      "resignation:black": 0,
    };
    for (const row of wins) {
      if (row.result in map) map[row.result] = row.qty;
    }

    const avgMoves = this.db
      .prepare(
        "SELECT AVG(total_moves) AS avg FROM games WHERE result IS NOT NULL",
      )
      .get();

    return {
      total: total.total,
      white: map.white,
      black: map.black,
      draw: map.draw,
      resignationWhite: map["resignation:white"],
      resignationBlack: map["resignation:black"],
      avgMoves: avgMoves.avg ? Math.round(avgMoves.avg) : 0,
    };
  }

  getRecentGames(limit = 10) {
    return this.db
      .prepare(
        `SELECT id, started_at, mode, depth, result, total_moves
         FROM games
         WHERE result IS NOT NULL
         ORDER BY id DESC
         LIMIT ?`,
      )
      .all(limit);
  }

  countFinishedGames() {
    return this.db
      .prepare("SELECT COUNT(*) AS total FROM games WHERE result IS NOT NULL")
      .get().total;
  }

  getHistoryPage(page, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    return this.db
      .prepare(
        `SELECT id, started_at, mode, depth, result, total_moves
         FROM games
         WHERE result IS NOT NULL
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(pageSize, offset);
  }

  getGameById(id) {
    return this.db
      .prepare(
        `SELECT id, started_at, ended_at, mode, depth, result, total_moves
         FROM games WHERE id = ?`,
      )
      .get(id);
  }

  getGameMoves(gameId) {
    return this.db
      .prepare(
        "SELECT move_number, san, fen FROM game_moves WHERE game_id = ? ORDER BY move_number",
      )
      .all(gameId);
  }
  clearHistory() {
    this.db.exec("DELETE FROM game_moves; DELETE FROM games;");
  }
}
