# Memory Match

Day 10 of Exploring Mini Projects: a memory card game in plain HTML, CSS and JavaScript. Flip two cards at a time, find every pair in the fewest moves, and beat your best score.

## Files

- `index.html` - the page and its markup
- `style.css` - the Ember gradient theme, 3D card flip, dark and light modes, responsive layout
- `script.js` - game logic, timer, scores and sound
- `README.md` - this file

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-10-memory-card-game/

Or open `index.html` in any modern browser. There is nothing to install.

## Features

- Three levels: Easy (3x4), Medium (4x4) and Hard (4x6)
- Four picture sets: Animals, Fruits, Space and Sports, drawn at random each game
- Move counter, timer and pairs found, with a best score per level
- Recent games list, saved in the browser (localStorage)
- Win screen with a star rating, a new-best badge and confetti
- Small sound effects with a mute button
- Dark and light theme, following your system by default
- Works with touch, mouse and keyboard, and respects reduced-motion settings

## Keyboard

| Key | Action |
| --- | --- |
| Tab | Move between controls and cards |
| Arrow keys | Move around the board (or between levels) |
| Enter / Space | Flip the focused card |
| R | Start a new game |

## How it works

Each game picks the right number of pictures for the level, doubles them into a deck and shuffles it with the Fisher-Yates method. Flipping two cards counts one move. A matching pair stays face up, and a mismatch flips back after a short pause while the board is locked so you cannot flip a third card. The timer starts on the first flip and pauses when the tab is hidden. Stars are based on how close your move count is to the number of pairs.

## Notes

- Scores stay on your device only. Clearing site data resets them.
- No libraries, no build step and no network requests.
