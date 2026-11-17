# Stopwatch and Timer (Mini Projects, Day 6)

A stopwatch with laps and a countdown timer with presets, a custom time, keyboard shortcuts and a sound and visual alert when the time runs out. Plain HTML, CSS and JavaScript, no libraries, no build step.

## Files

- `index.html` - the page: tabs, stopwatch panel, countdown panel
- `style.css` - the look, responsive layout and motion settings
- `script.js` - timing, laps, countdown, alarm and keyboard shortcuts
- `README.md` - this file

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-06-stopwatch/

Or open `index.html` in any modern browser.

## Features

- Stopwatch with start, pause, resume, reset and lap
- Lap list with the split and the total time, fastest lap in green and slowest in pink
- Countdown with four presets (1, 5, 10 and 25 minutes) and a custom hours, minutes and seconds field
- Ring that shows progress for both modes
- Alarm at zero: three tones repeated up to ten times, a pulsing card, and a message. Press Esc or Reset to stop it
- Sound on and off
- Laps, the last countdown time and the sound setting are remembered on this device
- Works on phone, tablet, laptop, TV and 4K screens
- Respects the reduced motion setting

## Keyboard

| Key | Action |
| --- | --- |
| Space | Start or pause the current timer |
| L | Save a lap (stopwatch) |
| R | Reset the current timer |
| 1 | Stopwatch |
| 2 | Countdown |
| Esc | Stop the alarm |
| Left and right arrows | Switch between the tabs |

## How it works

- Time comes from `performance.now()`. The display is calculated from the start time each frame, so it does not drift when the page is busy.
- The countdown also schedules a timer for the exact end, so the alarm still sounds if the tab is in the background.
- Sound uses the Web Audio API. If the browser blocks audio, the visual alert still shows.
- Saved data is read and written inside `try` blocks, so private browsing or a full storage never breaks the page.

## Notes

- The countdown inputs lock while the timer runs. Pause or reset to change the time.
- Hours can go up to 99, minutes and seconds up to 59.
