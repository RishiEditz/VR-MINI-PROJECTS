# Day 12: Random Quote Generator

Part of **Exploring Mini Projects**, one small browser project a day, built with plain HTML, CSS and JavaScript. No framework, no build step, no API key.

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-12-random-quote-generator/

Or open `index.html` in any modern browser.

## Files

- `index.html` the page markup
- `style.css` the orchid and sunset theme, layout and light mode
- `script.js` the quotes, shuffle, favorites, sharing and auto play

## Features

- 60 original quotes in five moods: Focus, Courage, Create, Life and Code
- A fresh gradient for every quote, with a small slide-in animation
- No repeats until you have seen every quote in the chosen mood (a shuffle bag)
- Back button that walks through the quotes you already saw
- Save favorites with a heart, kept on your device, with a drawer to view or remove them
- Copy a quote, or share it with your phone's share sheet when available
- Save a quote as a 1080 x 1080 picture card, drawn on a canvas
- Auto play that moves to a new quote every 6 seconds, with a progress bar
- Dark and light themes, remembered between visits
- Responsive from small phones to wide desktop screens

## Keyboard

- Space or Right arrow: new quote
- Left arrow: previous quote
- F: save or unsave the current quote
- Arrow keys on the mood chips: switch mood
- Escape: close the favorites drawer

## How it works

1. All quotes live in one object grouped by mood. The page flattens them into a list with an id each.
2. Picking a mood fills a "bag" with the shuffled ids of that mood. Each new quote pops one from the bag, so nothing repeats until the bag is empty, and a new round never starts with the quote that just ended the last one.
3. Every shown quote is pushed onto a history list, so Back and forward work like a browser.
4. Favorites, theme and the chosen mood are stored in `localStorage`. If storage is blocked, the app still works for the session.
5. The picture card is drawn with the Canvas API, wrapping the text to fit, then downloaded as a PNG.

## Notes

The quotes are original lines written for this project.
