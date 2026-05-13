import { Chess } from "chess.js";

export class ChessEngine {
  constructor(chessLib = new Chess()) {
    this.chess = chessLib;
  }

  resetGame() {
    this.chess.reset();
  }

  getBoard() {
    return this.chess.board();
  }

  getAsciiBoard() {
    return this.chess.ascii();
  }

  getFen() {
    return this.chess.fen();
  }

  getTurn() {
    return this.chess.turn();
  }

  getLastMove() {
    const history = this.chess.history({ verbose: true });
    return history.length > 0 ? history[history.length - 1] : null;
  }

  getHistory() {
    return this.chess.history({ verbose: true });
  }

  getMoveCount() {
    return this.chess.history().length;
  }

  loadFen(fen) {
    this.chess.load(fen);
  }

  getWinnerColor() {
    if (!this.chess.isCheckmate()) return null;
    // after checkmate, chess.turn() é o lado que perdeu (está em xeque-mate)
    return this.chess.turn() === "w" ? "b" : "w";
  }

  playMove(move) {
    try {
      const result = this.chess.move(move);
      return this.resolveMoveStatus(result);
    } catch (error) {
      return { status: "invalid-format" };
    }
  }

  playUciMove(uciMove) {
    try {
      if (!uciMove || uciMove.length < 4) {
        return { status: "invalid-format" };
      }

      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
      const result = this.chess.move({ from, to, promotion });
      return this.resolveMoveStatus(result);
    } catch (error) {
      return { status: "invalid-format" };
    }
  }

  resolveMoveStatus(result) {
    if (!result) {
      return { status: "invalid-move" };
    }

    if (this.chess.isCheckmate()) {
      return { status: "checkmate" };
    }

    if (this.chess.isDraw()) {
      return { status: "draw" };
    }

    return { status: "ok" };
  }
}
