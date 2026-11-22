# Day 11: Currency Converter

Part of **Exploring Mini Projects**, one small browser project a day, built with plain HTML, CSS and JavaScript. No framework, no build step, no API key.

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-11-currency-converter/

Or open `index.html` in any modern browser.

## Files

- `index.html` the page markup
- `style.css` the cobalt and lime theme, layout and light mode
- `script.js` the converter, chart, history and rate loading

## Features

- 30 currencies, with a swap button that flips the pair
- Live daily exchange rates from the free Frankfurter service
- A 30 day trend chart for the pair you picked, with a touch or hover readout
- Same amount in other popular currencies, one tap to switch
- Recent conversions saved on your device, tap one to bring it back
- Copy the result with one button
- Works offline: the last rates are saved, and sample rates are built in
- Dark and light themes, remembered between visits
- Responsive from small phones to wide desktop screens

## Keyboard

- Arrow up / down in the amount box: add or remove 1 (hold Shift for 100)
- Tab through the controls, Enter or Space to press a button

## How it works

1. One request fetches every rate against the US dollar. Any pair is then computed as `rate[to] / rate[from]`, so swapping or changing currencies needs no new request.
2. The chart asks for the last 30 days for the chosen pair and draws it as an SVG line.
3. Rates, chart data, history, theme and your last pair are stored in `localStorage`. If the network is down, the saved copy is used and the status line says so.
4. Numbers are formatted with `Intl.NumberFormat`, so grouping follows your browser's language.

## Notes

Rates are daily reference rates published for information. They are fine for planning a trip or a purchase, but they are not live trading prices.
