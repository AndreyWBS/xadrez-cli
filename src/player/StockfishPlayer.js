import Stockfish from "stockfish";

export class StockfishPlayer {
  constructor({ depth = 12 } = {}) {
    this.depth = depth;
    this.engine = null;
    this.pendingMove = null;
    this.initError = null;
    this.engineReady = this.initEngine().catch((error) => {
      this.initError = error;
      return null;
    });
  }

  async initEngine() {
    const factory =
      typeof Stockfish === "function" ? Stockfish : Stockfish?.default;

    if (typeof factory !== "function") {
      throw new Error("Falha ao iniciar Stockfish.");
    }

    const engine = await factory();

    if (!engine || typeof engine.sendCommand !== "function") {
      throw new Error("API do Stockfish incompatível neste ambiente.");
    }

    this.engine = engine;
    this.engine.listener = (message) => {
      this.handleMessage(message);
    };

    this.send("uci");
    this.send("isready");
    return engine;
  }

  handleMessage(message) {
    if (!message || !this.pendingMove) {
      return;
    }

    if (!message.startsWith("bestmove ")) {
      return;
    }

    const [_, bestMove] = message.split(" ");
    clearTimeout(this.pendingMove.timeoutId);
    this.pendingMove.resolve(
      bestMove && bestMove !== "(none)" ? bestMove : null,
    );
    this.pendingMove = null;
  }

  send(command) {
    if (!this.engine) {
      throw new Error("Stockfish ainda não inicializado.");
    }

    this.engine.sendCommand(command);
  }

  async getBestMove(fen) {
    await this.engineReady;

    if (this.initError) {
      throw this.initError;
    }

    if (this.pendingMove) {
      throw new Error("Stockfish ainda está pensando.");
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingMove = null;
        reject(new Error("Tempo de resposta do Stockfish esgotado."));
      }, 15000);

      this.pendingMove = { resolve, reject, timeoutId };
      this.send("isready");
      this.send(`position fen ${fen}`);
      this.send(`go depth ${this.depth}`);
    });
  }
}
