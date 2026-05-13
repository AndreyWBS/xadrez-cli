#!/usr/bin/env node

import { GameController } from "./src/controller/GameController.js";
import { ChessEngine } from "./src/engine/ChessEngine.js";
import { ChessJsBoardRenderer } from "./src/renderer/ChessJsBoardRenderer.js";
import { ConsoleUI } from "./src/ui/ConsoleUI.js";
import { GameRepository } from "./src/storage/GameRepository.js";

const engine = new ChessEngine();
const renderer = new ChessJsBoardRenderer();
const ui = new ConsoleUI();
const repository = new GameRepository();
const gameController = new GameController(engine, renderer, ui, repository);

gameController.start();
