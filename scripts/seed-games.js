#!/usr/bin/env node
/**
 * Seed: faz o Stockfish jogar contra si mesmo N partidas
 * e persiste tudo no banco SQLite.
 *
 * Uso:
 *   node scripts/seed-games.js [quantidade] [depth]
 *   node scripts/seed-games.js 5 4
 */

import { ChessEngine } from "../src/engine/ChessEngine.js";
import { StockfishPlayer } from "../src/player/StockfishPlayer.js";
import { GameRepository } from "../src/storage/GameRepository.js";

const TOTAL_GAMES = parseInt(process.argv[2], 10) || 5;
const DEPTH = parseInt(process.argv[3], 10) || 4;
const MAX_MOVES = 200; // evita loops infinitos em partidas muito longas

async function playGame(player, repo) {
  const engine = new ChessEngine();
  engine.resetGame();

  const gameId = repo.startGame("stockfish", DEPTH);
  let moveNumber = 0;

  while (true) {
    if (engine.getMoveCount() >= MAX_MOVES) {
      repo.finishGame(gameId, "draw", engine.getMoveCount());
      return "draw (limite de jogadas)";
    }

    const fen = engine.getFen();

    let bestMove;
    try {
      bestMove = await player.getBestMove(fen);
    } catch (err) {
      console.error(`  ⚠️  Erro ao obter jogada: ${err.message}`);
      repo.finishGame(gameId, "draw", engine.getMoveCount());
      return "erro";
    }

    if (!bestMove) {
      repo.finishGame(gameId, "draw", engine.getMoveCount());
      return "draw";
    }

    const result = engine.playUciMove(bestMove);
    moveNumber++;

    const lastMove = engine.getLastMove();
    if (lastMove) {
      repo.saveMove(gameId, moveNumber, lastMove.san, engine.getFen());
    }

    if (result.status === "checkmate") {
      const winner = engine.getWinnerColor() === "w" ? "white" : "black";
      repo.finishGame(gameId, winner, engine.getMoveCount());
      return `checkmate — ${winner === "white" ? "brancas" : "pretas"} vencem`;
    }

    if (result.status === "draw") {
      repo.finishGame(gameId, "draw", engine.getMoveCount());
      return "draw";
    }
  }
}

async function main() {
  console.log(
    `\n♟  Iniciando seed: ${TOTAL_GAMES} partida(s), depth ${DEPTH}\n`,
  );

  const repo = new GameRepository();

  // Uma única instância do Stockfish joga dos dois lados
  const player = new StockfishPlayer({ depth: DEPTH });
  await player.engineReady;

  for (let i = 1; i <= TOTAL_GAMES; i++) {
    process.stdout.write(`  Partida ${i}/${TOTAL_GAMES} ... `);
    const outcome = await playGame(player, repo);
    console.log(outcome);
  }

  const stats = repo.getStats();
  console.log("\n=== Resultado final do banco ===");
  console.log(`  Total de partidas : ${stats.total}`);
  console.log(`  Vitórias brancas  : ${stats.white}`);
  console.log(`  Vitórias pretas   : ${stats.black}`);
  console.log(`  Empates           : ${stats.draw}`);
  console.log(`  Média de jogadas  : ${stats.avgMoves}`);
  console.log("\n✅ Seed concluído.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
