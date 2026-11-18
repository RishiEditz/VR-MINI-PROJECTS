# Password Generator (Mini Projects, Day 7)

A password generator with a length slider, character sets, a look-alike filter, a passphrase mode, a strength meter and one-tap copy. Plain HTML, CSS and JavaScript, no libraries, no build step.

## Files

- `index.html` - the page: tabs, output, strength meter, controls
- `style.css` - the look, responsive layout and motion settings
- `script.js` - random generation, strength, copy and keyboard shortcuts
- `words.js` - the 512-word list used by passphrase mode
- `README.md` - this file

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-07-password-generator/

Or open `index.html` in any modern browser.

## Features

- Length slider from 4 to 64, with minus and plus buttons and a number box
- Lowercase, uppercase, numbers and symbols, and at least one character from every chosen set
- Option to avoid look-alike characters (i, l, 1, L, o, 0, O)
- Passphrase mode: 3 to 10 random words, four separators, capital letters and an optional number
- Strength meter with five levels, the bits of entropy and an estimated time to guess
- Copy button with a toast message, plus New and Hide buttons
- Settings are remembered on this device, passwords are never saved
- Works on phone, tablet, laptop, TV and 4K screens
- Respects the reduced motion setting

## Keyboard

| Key | Action |
| --- | --- |
| G | Generate a new one |
| C | Copy |
| H | Hide or show |
| 1 | Password |
| 2 | Passphrase |
| Left and right arrows | Switch between the tabs |

## How it works

- Every random choice uses `crypto.getRandomValues`, never `Math.random`.
- Numbers are picked with rejection sampling, so no character is more likely than another. The final order is mixed with a Fisher-Yates shuffle.
- Strength is the entropy: length times log2 of the pool size. A passphrase word adds 9 bits, because the list has 512 words.
- The time to guess assumes 10 billion guesses a second.
- If the browser has no secure random generator, the page says so and does not generate anything.

## Notes

- Nothing is sent anywhere. Everything runs in the browser.
- The last character set cannot be switched off.
