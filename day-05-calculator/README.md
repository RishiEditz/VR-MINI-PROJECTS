# Calculator (Day 5)

A clean calculator that runs in the browser. Plain HTML, CSS and JavaScript, no libraries, no build step.

## Files

- `index.html` - the page: display, keypad and history panel
- `style.css` - colours, type scale, layout and responsive rules
- `script.js` - the calculator logic and history
- `README.md` - this file

## Run it

Open `index.html` in any modern browser. Or try it live on GitHub Pages:
https://rishieditz.github.io/VR-MINI-PROJECTS/day-05-calculator/

## Features

- Correct order of operations (multiply and divide before add and subtract)
- Brackets, with `( )` on the keypad or `(` and `)` on the keyboard
- Percent: `50 %` gives `0.5`
- Live preview of the answer while you type
- Backspace to fix a mistake, `C` to clear everything
- Division by zero and invalid expressions show a clear message
- Number formatting with commas, up to 16 digits typed
- History of your last 20 calculations, saved in this browser. Tap one to use its answer again. Clear removes all of it.
- Works on phone, tablet, laptop, large screen and TV-size displays

## Keyboard

| Key | Action |
| --- | --- |
| 0 to 9 | Type a number |
| `.` | Decimal point |
| `+` `-` `*` `/` | Operators (`x` also works for multiply) |
| `(` `)` | Brackets |
| `%` | Percent |
| Enter or `=` | Show the answer |
| Backspace | Delete the last digit or key |
| Esc or `C` | Clear everything |

## How it works

The calculator does not use `eval`. Each key adds a token (number, operator or bracket) to a list. When you press `=`, the list is turned into a calculation order with the shunting-yard method and then added up with a small stack. Only `+ - * /` and brackets are allowed, so typed text can never run as code.

Results are rounded to 15 significant digits, so `0.1 + 0.2` shows `0.3`.

## Notes

- History uses `localStorage`. If the browser blocks storage, the calculator still works, but history is kept only until the page is closed.
- Motion is reduced automatically when the device asks for it.
