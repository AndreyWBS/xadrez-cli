export class UnicodeBoardRenderer {
  constructor() {
    this.unicodePieces = {
      w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
      b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
    };
  }

  render(board) {
    const lines = [];

    for (let rank = 0; rank < 8; rank += 1) {
      const row = board[rank]
        .map((square) => {
          if (!square) {
            return "·";
          }

          return this.unicodePieces[square.color][square.type];
        })
        .join(" ");

      lines.push(`${8 - rank} ${row}`);
    }

    lines.push("  a b c d e f g h");
    return lines.join("\n");
  }
}
