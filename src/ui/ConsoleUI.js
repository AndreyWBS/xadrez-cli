import readline from "readline";

export class ConsoleUI {
  constructor(readlineModule = readline) {
    this.rl = readlineModule.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  showMenu() {
    console.clear();
    console.log("=== XADREZ CLI ===");
    console.log("1) Jogar (2 jogadores)");
    console.log("2) Jogar vs Stockfish");
    console.log("3) Sair");
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

  ask(prompt, callback) {
    this.rl.question(prompt, callback);
  }

  onSignal(signal, callback) {
    this.rl.on(signal, callback);
  }

  close() {
    this.rl.close();
  }
}
