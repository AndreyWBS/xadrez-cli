import readline from "readline";

export class ConsoleUI {
  constructor(readlineModule = readline) {
    this.rl = readlineModule.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.replayKeypressHandler = null;
    this.replayBuffer = "";
    this.keypressConfigured = false;
  }

  showMenu() {
    console.clear();
    console.log("=== XADREZ CLI ===");
    console.log("1) Jogar (2 jogadores)");
    console.log("2) Jogar vs Stockfish");
    console.log("3) Estatísticas");
    console.log("4) Histórico de partidas");
    console.log("5) Sair");
    console.log("\nEscolha uma opção:");
  }

  showBlindModeMenu() {
    console.clear();
    console.log("=== MODO DE JOGO ===");
    console.log("1) Normal");
    console.log("2) Às cegas");
    console.log("3) Voltar");
    console.log("\nEscolha uma opção:");
  }

  showDifficultyMenu() {
    console.clear();
    console.log("=== DIFICULDADE ===");
    console.log("1) Fácil   (depth  4)");
    console.log("2) Médio   (depth  8)");
    console.log("3) Difícil (depth 16)");
    console.log("4) Voltar");
    console.log("\nEscolha uma opção:");
  }

  showBoard(boardText) {
    console.clear();
    console.log(boardText);
    console.log("\nDigite sua jogada (ex: e2e4)");
    console.log("Comandos: menu | novo | sair");
  }

  showBlindMove(lastMove) {
    console.clear();
    if (lastMove) {
      const color = lastMove.color === "w" ? "Brancas" : "Pretas";
      console.log(
        `${color} — ${lastMove.san} (${lastMove.from} → ${lastMove.to})`,
      );
    }
  }

  showMessage(message) {
    console.log(message);
  }

  showStats(stats, recentGames) {
    console.clear();
    console.log("=== ESTATÍSTICAS ===");
    console.log(`Total de partidas         : ${stats.total}`);
    console.log(`Vitórias (brancas)        : ${stats.white}`);
    console.log(`Vitórias (pretas)         : ${stats.black}`);
    console.log(`Empates                   : ${stats.draw}`);
    console.log(`Desistências (brancas)    : ${stats.resignationWhite}`);
    console.log(`Desistências (pretas)     : ${stats.resignationBlack}`);
    console.log(`Média de jogadas          : ${stats.avgMoves}`);

    if (recentGames.length > 0) {
      console.log("\n=== ÚLTIMAS PARTIDAS ===");
      for (const g of recentGames) {
        const date = g.started_at.slice(0, 10);
        const mode =
          g.mode === "stockfish"
            ? `vs Stockfish (depth ${g.depth})`
            : "2 jogadores";
        const result =
          g.result === "white"
            ? "⬜ Brancas"
            : g.result === "black"
              ? "⬛ Pretas"
              : g.result === "draw"
                ? "🤝 Empate"
                : g.result === "resignation:white"
                  ? "🏳️ Brancas desistiram"
                  : g.result === "resignation:black"
                    ? "🏳️ Pretas desistiram"
                    : g.result;
        console.log(
          `  #${g.id} | ${date} | ${mode} | ${result} | ${g.total_moves} jogadas`,
        );
      }
    }
  }

  showHistoryPage(games, page, totalPages, total) {
    console.clear();
    console.log(
      `=== HISTÓRICO DE PARTIDAS === (página ${page}/${totalPages} — ${total} total)`,
    );
    console.log();

    if (games.length === 0) {
      console.log("  Nenhuma partida registrada ainda.");
    } else {
      games.forEach((g, i) => {
        const date = g.started_at.slice(0, 10);
        const mode =
          g.mode === "stockfish"
            ? `vs Stockfish (depth ${g.depth})`
            : "2 jogadores";
        const result =
          g.result === "white"
            ? "⬜ Brancas venceram"
            : g.result === "black"
              ? "⬛ Pretas venceram"
              : g.result === "draw"
                ? "🤝 Empate"
                : g.result === "resignation:white"
                  ? "🏳️ Brancas desist."
                  : g.result === "resignation:black"
                    ? "🏳️ Pretas desist."
                    : g.result;
        console.log(
          `  ${String(i + 1).padStart(2)}) #${g.id} | ${date} | ${mode} | ${result} | ${g.total_moves} jogadas`,
        );
      });
    }

    console.log();
    const nav = [];
    if (page > 1) nav.push("[←|<|p] Anterior");
    if (page < totalPages) nav.push("[→|>|n] Próxima");
    nav.push("[1-10] Abrir partida");
    nav.push("[limpar] Apagar histórico");
    nav.push("[Esc|voltar] Menu");
    console.log("  " + nav.join(" | "));
    console.log();
  }

  showReplay(boardText, fen, moveIdx, totalMoves, sanLabel, gameInfo) {
    console.clear();
    console.log(
      `=== PARTIDA #${gameInfo.id} === (${gameInfo.mode} | ${gameInfo.result})`,
    );

    if (moveIdx === 0) {
      console.log("  Posição inicial");
    } else {
      console.log(`  Jogada ${moveIdx}/${totalMoves}: ${sanLabel}`);
    }

    console.log();
    console.log(boardText);
    console.log();
    console.log(`  FEN: ${fen}`);
    console.log();
    console.log(
      "  [→] Próxima | [←] Anterior | [Esc] Voltar | [fen] Copiar FEN",
    );
    console.log();
  }

  askReplayCommand(callback) {
    const input = this.rl.input;
    const output = this.rl.output;

    if (!input || !input.isTTY || typeof input.setRawMode !== "function") {
      this.ask("> ", callback);
      return;
    }

    this.stopReplayInputCapture();
    if (!this.keypressConfigured) {
      readline.emitKeypressEvents(input);
      this.keypressConfigured = true;
    }
    this.replayBuffer = "";
    output.write("> ");
    input.setRawMode(true);
    let finished = false;

    const cleanup = () => {
      this.stopReplayInputCapture();
    };

    const finish = (value) => {
      if (finished) return;
      finished = true;
      output.write("\n");
      cleanup();
      callback(value);
    };

    const onKeypress = (str, key) => {
      if (!key) return;

      if (key.name === "return") {
        finish(this.replayBuffer.trim());
        return;
      }

      if (key.ctrl && key.name === "c") {
        finish("sair");
        return;
      }

      if (key.name === "right") {
        finish(">>");
        return;
      }

      if (key.name === "left") {
        finish("<<");
        return;
      }

      if (key.name === "escape") {
        finish("voltar");
        return;
      }

      if (key.name === "backspace") {
        if (this.replayBuffer.length > 0) {
          this.replayBuffer = this.replayBuffer.slice(0, -1);
        }
        return;
      }

      const printable =
        typeof str === "string" && str.length > 0
          ? str
          : typeof key.sequence === "string"
            ? key.sequence
            : "";

      // Texto digitável normal (inclusive acentos) sem duplicar eventos de controle.
      if (
        printable &&
        !key.ctrl &&
        !key.meta &&
        key.name !== "escape" &&
        key.name !== "return"
      ) {
        this.replayBuffer += printable;
      }
    };

    this.replayKeypressHandler = onKeypress;
    input.on("keypress", onKeypress);
  }

  stopReplayInputCapture() {
    const input = this.rl.input;
    if (!input || typeof input.removeListener !== "function") return;

    if (this.replayKeypressHandler) {
      input.removeListener("keypress", this.replayKeypressHandler);
      this.replayKeypressHandler = null;
    }

    this.replayBuffer = "";

    if (input.isTTY && typeof input.setRawMode === "function") {
      input.setRawMode(false);
    }
  }

  ask(prompt, callback) {
    this.stopReplayInputCapture();
    this.rl.question(prompt, callback);
  }

  onSignal(signal, callback) {
    this.rl.on(signal, callback);
  }

  close() {
    this.rl.close();
  }
}
