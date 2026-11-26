# Day 15: Pomodoro Focus Timer

Part of **Exploring Mini Projects**, one small browser project a day, built with plain HTML, CSS and JavaScript. No framework, no build step, no API key.

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-15-pomodoro-timer/

Or open `index.html` in any modern browser.

## Files

- `index.html` the page markup
- `style.css` the tomato theme, the dial, stats, settings and light mode
- `script.js` the timer, cycles, chime, stats and settings

## Features

- Three modes: Focus, Short break and Long break, each with its own colour
- A progress ring that drains as time passes
- Start, pause, reset and skip, plus an optional task name for the session
- Every fourth focus session earns a long break (you can change that number)
- Set your own lengths: focus, short break, long break and sessions per cycle
- Optional auto-start for the next round
- A soft chime when a round ends, with a sound on/off switch
- The countdown also shows in the browser tab title
- Today's sessions, focused minutes and streak, plus a 7-day bar chart
- A running timer survives a page reload
- Dark and light themes, remembered between visits
- Responsive from small phones to 4K screens, with 44 px touch targets
- Respects reduced motion

## Keyboard

- Space: start or pause
- R: reset the current round
- S: skip to the next round

## How it works

1. The timer stores the moment it should finish, not a count of ticks. Every 200 ms it works out the time left from the clock, so it stays correct even if the tab is in the background or the page reloads.
2. The ring is an SVG circle. Its dash offset is set to the share of time left.
3. When a round ends, the app records it (for focus rounds), picks the next mode and rings a short three-note chime made with the Web Audio API.
4. History is a small object keyed by date, kept in `localStorage`. The streak counts back day by day from today. If storage is blocked, the timer still works for the session.

## Notes

The chime is generated in code, so there are no audio files. Browsers only allow sound after you have tapped something, so press Start once and it will ring when the round ends.
