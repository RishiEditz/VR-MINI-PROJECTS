# Day 13: Tic-Tac-Toe vs Computer

Part of **Exploring Mini Projects**, one small browser project a day, built with plain HTML, CSS and JavaScript. No framework, no build step, no API key.

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-13-tic-tac-toe/

Or open `index.html` in any modern browser.

## Files

- `index.html` the page markup
- `style.css` the lagoon theme, layout and light mode
- `script.js` the game, the computer player, scores and keyboard support

## Features

- Play X against the computer, which plays O
- Easy mode: the computer takes a win when it sees one, otherwise it plays a random square, so you can beat it
- Unbeatable mode: the computer uses minimax, so the best you can get is a draw
- Choose who goes first, you or the computer
- A glowing line draws across three in a row
- Score for you, draws and the computer, saved on your device
- Dark and light themes, remembered between visits
- Responsive from small phones to wide desktop screens, with 44 px touch targets
- Respects reduced motion

## Keyboard

- 1 to 9: pick a square (left to right, top to bottom)
- N: new game
- Arrow keys on the option buttons: switch difficulty or who goes first

## How it works

1. The board is an array of nine cells. Eight winning lines are listed once and checked after every move.
2. Unbeatable mode runs minimax: it tries every possible continuation, scores a computer win as `10 - depth` and a loss as `depth - 10`, so it wins as fast as it can and loses as slowly as it must. Ties between equally good moves are picked at random so games vary.
3. Easy mode takes an immediate win if there is one, and otherwise plays a random free square.
4. The computer waits half a second before answering so the move is easy to follow.
5. Scores, difficulty, who goes first and the theme are kept in `localStorage`. If storage is blocked, the game still works for the session.

## Notes

Tic-tac-toe is a solved game, so Unbeatable mode never loses. If you ever win against it, that is a bug worth reporting.
