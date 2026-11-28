# Day 16: Color Palette Generator

Part of **Exploring Mini Projects**, one small browser project a day, built with plain HTML, CSS and JavaScript. No framework, no build step, no API key.

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-16-color-palette-generator/

Or open `index.html` in any modern browser.

## Files

- `index.html` the page markup
- `style.css` the layout, swatches, live preview and light and dark themes
- `script.js` the colour maths, harmonies, history, export and storage

## Features

- Generate a fresh palette of 3 to 7 colours with one tap
- Colour harmonies: random, analogous, complementary, triadic, split and mono
- Lock any swatch and keep generating around it
- Undo and redo through your last 60 palettes
- Edit any swatch with the colour picker
- Contrast score on every swatch (AAA, AA, AA large or Low)
- A live preview that shows the palette on a real page, with its own text contrast
- Copy any colour as HEX, RGB or HSL
- Export as CSS variables, JSON or a PNG image
- Share a palette as a link (the colours live in the URL hash)
- Save favourite palettes, kept on your device
- Dark and light themes, remembered between visits
- Responsive from small phones to 4K screens, with large touch targets
- Respects reduced motion

## Keyboard

- Space: generate
- Z: undo
- Shift + Z: redo
- 1 to 7: lock or unlock that swatch

## How it works

1. Colours are made in HSL, which makes harmonies simple: each harmony is a set of hue offsets from a base hue, with small random changes to saturation and lightness.
2. Locked swatches are kept as they are, and only the others are replaced.
3. Contrast uses the WCAG formula: the relative luminance of each colour, then the ratio against white or black, whichever reads better.
4. The preview picks the lightest colour as the page, the darkest as the text and the most saturated as the accent.
5. The PNG is drawn on a canvas. The share link stores the hex codes in the URL hash, so opening it restores the palette.
6. Saved palettes and the theme live in `localStorage`. If storage is blocked, everything else still works.

## Notes

Copying uses the clipboard API and falls back to a hidden text field on older browsers.
