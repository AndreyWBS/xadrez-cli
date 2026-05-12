# xadrez

CLI de xadrez para terminal, com suporte a:

- Partida local (2 jogadores)
- Partida contra Stockfish
- Modo normal e modo as cegas
- Menu interativo e tratamento de erros

## Requisitos

- Node.js 18+

## Instalacao

### Usando npm localmente

```bash
npm install
npm start
```

### Usando como CLI global

```bash
npm install -g xadrez
xadrez
```

## Como jogar

Ao iniciar, o menu principal oferece:

1. Jogar (2 jogadores)
2. Jogar vs Stockfish
3. Sair

Depois de escolher o tipo de partida, voce escolhe:

1. Normal
2. As cegas
3. Voltar

Se escolher Stockfish, ha um menu de dificuldade:

1. Facil (depth 4)
2. Medio (depth 8)
3. Dificil (depth 16)
4. Voltar

## Entradas de jogada

Digite jogadas no formato esperado pelo `chess.js`, por exemplo:

- `e4`
- `Nf3`
- `Qh5`
- `exd5`

Obs.: o sistema tambem tenta aceitar entrada tipo `e2e4`, mas o formato SAN (`e4`, `Nf3`, etc.) e o mais confiavel.

## Comandos durante a partida

- `menu`: volta ao menu principal
- `novo`: reinicia a partida atual
- `sair`: encerra o programa
- `tabuleiro`: mostra o tabuleiro (util quando estiver no modo as cegas)

## Modo as cegas

No modo as cegas, o console e limpo a cada lance e apenas o ultimo movimento e exibido, por exemplo:

`Pretas — Nf6 (g8 → f6)`

## Scripts

- `npm start`: executa a aplicacao
- `npm run check`: valida sintaxe de todos os arquivos principais
- `npm test`: alias para `npm run check`

## Estrutura do projeto

```text
.
├── index.js
├── package.json
└── src
    ├── controller
    │   └── GameController.js
    ├── engine
    │   └── ChessEngine.js
    ├── player
    │   └── StockfishPlayer.js
    ├── renderer
    │   ├── ChessJsBoardRenderer.js
    │   └── UnicodeBoardRenderer.js
    └── ui
        └── ConsoleUI.js
```

## Publicacao no npm

1. Atualize a versao no `package.json` (seguindo semver).
2. Faca login no npm:

```bash
npm login
```

3. Verifique o conteudo que sera publicado:

```bash
npm pack --dry-run
```

4. Publique:

```bash
npm publish
```

Se o pacote for escopado (ex.: `@usuario/xadrez`), use:

```bash
npm publish --access public
```

## Licenca

ISC
