import { StockfishPlayer } from "../player/StockfishPlayer.js";

export class GameController {
  constructor(engine, renderer, ui, repository = null) {
    this.engine = engine;
    this.renderer = renderer;
    this.ui = ui;
    this.repository = repository;
    this.computerPlayer = null;
    this.gameStarted = false;
    this.blindMode = false;
    this.currentGameId = null;
  }

  start() {
    this.registerEvents();
    this.askMenu();
  }

  registerEvents() {
    this.ui.onSignal("SIGINT", () => {
      this.ui.showMessage("\nInterrompido pelo usuário.");
      this.closeApp();
    });

    this.ui.onSignal("close", () => {
      process.exit(0);
    });
  }

  closeApp() {
    this.ui.showMessage("\nAté a próxima!");
    this.ui.close();
  }

  drawBoard() {
    if (this.blindMode) {
      this.ui.showBlindMove(this.engine.getLastMove());
      return;
    }
    const boardText = this.renderer.render(
      this.engine.getBoard(),
      this.engine.getAsciiBoard(),
    );
    this.ui.showBoard(boardText);
  }

  askMenu() {
    this.ui.showMenu();

    this.ui.ask("> ", (choice) => {
      try {
        this.handleMenuChoice(choice);
      } catch (error) {
        this.ui.showMessage("❌ Erro no menu: " + error.message);
        this.askMenu();
      }
    });
  }

  handleMenuChoice(choice) {
    const normalized = choice.trim();

    if (normalized === "1") {
      this.computerPlayer = null;
      this.askBlindMode(() => this.startGame());
      return;
    }

    if (normalized === "2") {
      this.askBlindMode(() => this.askDifficulty());
      return;
    }

    if (normalized === "3") {
      this.showStats();
      return;
    }

    if (normalized === "4") {
      this.showHistory(1);
      return;
    }

    if (normalized === "5") {
      this.closeApp();
      return;
    }

    this.ui.showMessage("❌ Opção inválida. Tente novamente.");
    this.askMenu();
  }

  askBlindMode(onConfirm) {
    this.ui.showBlindModeMenu();

    this.ui.ask("> ", (choice) => {
      const normalized = choice.trim();

      if (normalized === "1") {
        this.blindMode = false;
        onConfirm();
        return;
      }

      if (normalized === "2") {
        this.blindMode = true;
        onConfirm();
        return;
      }

      if (normalized === "3") {
        this.askMenu();
        return;
      }

      this.ui.showMessage("❌ Opção inválida. Tente novamente.");
      this.askBlindMode(onConfirm);
    });
  }

  askDifficulty() {
    this.ui.showDifficultyMenu();

    this.ui.ask("> ", (choice) => {
      const depthMap = { 1: 4, 2: 8, 3: 16 };
      const normalized = choice.trim();

      if (normalized === "4") {
        this.askMenu();
        return;
      }

      const depth = depthMap[normalized];

      if (!depth) {
        this.ui.showMessage("❌ Opção inválida. Tente novamente.");
        this.askDifficulty();
        return;
      }

      this.computerPlayer = new StockfishPlayer({ depth });
      this.startGame();
    });
  }

  startGame() {
    this.gameStarted = true;
    this.engine.resetGame();

    if (this.repository) {
      const mode = this.computerPlayer ? "stockfish" : "pvp";
      const depth = this.computerPlayer ? this.computerPlayer.depth : null;
      this.currentGameId = this.repository.startGame(mode, depth);
    }

    this.drawBoard();
    this.askMove();
  }

  askMove() {
    if (!this.gameStarted) {
      return;
    }

    this.ui.ask("> ", async (input) => {
      try {
        await this.handleMoveInput(input);
      } catch (error) {
        this.ui.showMessage("❌ Erro inesperado: " + error.message);
      }

      if (this.gameStarted) {
        this.askMove();
      }
    });
  }

  async handleMoveInput(input) {
    const move = input.trim().toLowerCase();

    if (!move) {
      this.ui.showMessage("❌ Entrada vazia. Digite uma jogada válida.");
      return;
    }

    if (move === "menu") {
      this.gameStarted = false;
      this.askMenu();
      return;
    }

    if (move === "novo") {
      this.engine.resetGame();
      this.ui.showMessage("✅ Nova partida iniciada.");
      this.drawBoard();
      return;
    }

    if (move === "tabuleiro") {
      const boardText = this.renderer.render(
        this.engine.getBoard(),
        this.engine.getAsciiBoard(),
      );
      this.ui.showBoard(boardText);
      return;
    }

    if (move === "sair") {
      if (this.repository && this.currentGameId) {
        const turn = this.engine.getTurn();
        const resigned = turn === "w" ? "black" : "white";
        this.repository.finishGame(
          this.currentGameId,
          `resignation:${resigned}`,
          this.engine.getMoveCount(),
        );
        this.currentGameId = null;
      }
      this.closeApp();
      return;
    }

    const moveResult = this.engine.playMove(move);

    if (moveResult.status === "invalid-format") {
      this.ui.showMessage("❌ Formato de jogada inválido. Use algo como e2e4.");
      return;
    }

    if (moveResult.status === "invalid-move") {
      this.ui.showMessage("❌ Jogada inválida!");
      return;
    }

    this._recordMove();

    this.drawBoard();

    if (this.finishGameIfNeeded(moveResult)) {
      return;
    }

    await this.playComputerTurn();
  }

  async playComputerTurn() {
    if (
      !this.gameStarted ||
      !this.computerPlayer ||
      this.engine.getTurn() !== "b"
    ) {
      return;
    }

    this.ui.showMessage("🤖 Stockfish está pensando...");

    try {
      const bestMove = await this.computerPlayer.getBestMove(
        this.engine.getFen(),
      );

      if (!bestMove) {
        this.ui.showMessage("⚠️ Stockfish não encontrou jogada válida.");
        return;
      }

      const botResult = this.engine.playUciMove(bestMove);

      if (
        botResult.status === "invalid-format" ||
        botResult.status === "invalid-move"
      ) {
        this.ui.showMessage("⚠️ Stockfish retornou uma jogada inválida.");
        return;
      }

      this.ui.showMessage("🤖 Stockfish jogou: " + bestMove);
      this._recordMove();
      this.drawBoard();
      this.finishGameIfNeeded(botResult);
    } catch (error) {
      this.ui.showMessage("⚠️ Erro ao consultar o Stockfish: " + error.message);
    }
  }

  finishGameIfNeeded(result) {
    if (result.status === "checkmate") {
      this.ui.showMessage("🏁 Xeque-mate!");
      if (this.repository && this.currentGameId) {
        const winner = this.engine.getWinnerColor() === "w" ? "white" : "black";
        this.repository.finishGame(
          this.currentGameId,
          winner,
          this.engine.getMoveCount(),
        );
      }
      this.gameStarted = false;
      this.currentGameId = null;
      this.askMenu();
      return true;
    }

    if (result.status === "draw") {
      this.ui.showMessage("🤝 Empate!");
      if (this.repository && this.currentGameId) {
        this.repository.finishGame(
          this.currentGameId,
          "draw",
          this.engine.getMoveCount(),
        );
      }
      this.gameStarted = false;
      this.currentGameId = null;
      this.askMenu();
      return true;
    }

    return false;
  }

  _recordMove() {
    if (!this.repository || !this.currentGameId) return;
    const lastMove = this.engine.getLastMove();
    if (!lastMove) return;
    const moveCount = this.engine.getMoveCount();
    const fen = this.engine.getFen();
    this.repository.saveMove(this.currentGameId, moveCount, lastMove.san, fen);
  }

  showStats() {
    if (!this.repository) {
      this.ui.showMessage("⚠️ Repositório não disponível.");
      this.askMenu();
      return;
    }

    const stats = this.repository.getStats();
    const recent = this.repository.getRecentGames(5);
    this.ui.showStats(stats, recent);

    this.ui.ask("\nPressione Enter para voltar...", () => {
      this.askMenu();
    });
  }

  // ─── HISTÓRICO ───────────────────────────────────────────────────────────

  showHistory(page) {
    if (!this.repository) {
      this.ui.showMessage("⚠️ Repositório não disponível.");
      this.askMenu();
      return;
    }

    const PAGE_SIZE = 10;
    const total = this.repository.countFinishedGames();
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const games = this.repository.getHistoryPage(safePage, PAGE_SIZE);

    this.ui.showHistoryPage(games, safePage, totalPages, total);

    this.ui.askReplayCommand((input) => {
      const cmd = input.trim().toLowerCase();

      if (cmd === "voltar" || cmd === "esc") {
        this.askMenu();
        return;
      }

      if (cmd === "n" || cmd === ">" || cmd === ">>") {
        this.showHistory(safePage + 1);
        return;
      }

      if (cmd === "p" || cmd === "<" || cmd === "<<") {
        this.showHistory(safePage - 1);
        return;
      }

      if (cmd === "fen") {
        this.ui.showMessage("ℹ️ 'fen' funciona dentro do replay da partida.");
        this.showHistory(safePage);
        return;
      }

      if (cmd === "limpar") {
        this.confirmClearHistory(safePage);
        return;
      }

      // número de 1 a 10 → abre a partida da linha correspondente
      const lineNum = parseInt(cmd, 10);
      if (!isNaN(lineNum) && lineNum >= 1 && lineNum <= games.length) {
        const game = games[lineNum - 1];
        this.replayGame(game.id, 0, safePage);
        return;
      }

      this.ui.showMessage("❌ Opção inválida.");
      this.showHistory(safePage);
    });
  }

  confirmClearHistory(currentPage) {
    this.ui.showMessage(
      "\n⚠️  Isso apagará TODAS as partidas e jogadas do banco.",
    );
    this.ui.ask("  Confirma? (sim/não) > ", (input) => {
      if (input.trim().toLowerCase() === "sim") {
        this.repository.clearHistory();
        this.ui.showMessage("🗑️  Histórico apagado.");
        this.showHistory(1);
      } else {
        this.ui.showMessage("Cancelado.");
        this.showHistory(currentPage);
      }
    });
  }

  // ─── REPLAY ──────────────────────────────────────────────────────────────

  replayGame(gameId, moveIdx, historyPage) {
    if (!this.repository) {
      this.askMenu();
      return;
    }

    const game = this.repository.getGameById(gameId);
    if (!game) {
      this.ui.showMessage("❌ Partida não encontrada.");
      this.showHistory(historyPage);
      return;
    }

    const moves = this.repository.getGameMoves(gameId);
    const totalMoves = moves.length;

    // moveIdx 0 = posição inicial, 1..N = após jogada N
    const safeIdx = Math.min(Math.max(0, moveIdx), totalMoves);

    let fen;
    let sanLabel = "";
    if (safeIdx === 0) {
      fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    } else {
      const m = moves[safeIdx - 1];
      fen = m.fen;
      sanLabel = m.san;
    }

    this.engine.loadFen(fen);
    const boardText = this.renderer.render(
      this.engine.getBoard(),
      this.engine.getAsciiBoard(),
    );

    const resultLabel =
      game.result === "white"
        ? "⬜ Brancas venceram"
        : game.result === "black"
          ? "⬛ Pretas venceram"
          : game.result === "draw"
            ? "🤝 Empate"
            : game.result === "resignation:white"
              ? "🏳️ Brancas desistiram"
              : game.result === "resignation:black"
                ? "🏳️ Pretas desistiram"
                : game.result;

    const modeLabel =
      game.mode === "stockfish"
        ? `vs Stockfish (depth ${game.depth})`
        : "2 jogadores";

    this.ui.showReplay(boardText, fen, safeIdx, totalMoves, sanLabel, {
      id: game.id,
      mode: modeLabel,
      result: resultLabel,
    });

    this.ui.askReplayCommand((input) => {
      const cmd = input.trim().toLowerCase();

      if (cmd === "voltar" || cmd === "") {
        this.showHistory(historyPage);
        return;
      }

      if (
        cmd === ">" ||
        cmd === ">>" ||
        cmd === "proximo" ||
        cmd === "próximo"
      ) {
        this.replayGame(gameId, safeIdx + 1, historyPage);
        return;
      }

      if (cmd === "<" || cmd === "<<" || cmd === "anterior") {
        this.replayGame(gameId, safeIdx - 1, historyPage);
        return;
      }

      if (cmd === "fen") {
        this.ui.showMessage(`\nFEN copiado:\n${fen}`);
        this.ui.ask("\nPressione Enter para continuar...", () => {
          this.replayGame(gameId, safeIdx, historyPage);
        });
        return;
      }

      this.ui.showMessage("❌ Comando inválido. Use > | < | fen | voltar");
      this.replayGame(gameId, safeIdx, historyPage);
    });
  }
}
