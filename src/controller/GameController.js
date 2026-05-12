import { StockfishPlayer } from "../player/StockfishPlayer.js";

export class GameController {
  constructor(engine, renderer, ui) {
    this.engine = engine;
    this.renderer = renderer;
    this.ui = ui;
    this.computerPlayer = null;
    this.gameStarted = false;
    this.blindMode = false;
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
      this.drawBoard();
      this.finishGameIfNeeded(botResult);
    } catch (error) {
      this.ui.showMessage("⚠️ Erro ao consultar o Stockfish: " + error.message);
    }
  }

  finishGameIfNeeded(result) {
    if (result.status === "checkmate") {
      this.ui.showMessage("🏁 Xeque-mate!");
      this.gameStarted = false;
      this.askMenu();
      return true;
    }

    if (result.status === "draw") {
      this.ui.showMessage("🤝 Empate!");
      this.gameStarted = false;
      this.askMenu();
      return true;
    }

    return false;
  }
}
