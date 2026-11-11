# Typing Speed Test (Exploring Mini Projects, Day 1)

A single-page typing speed test. Open `index.html` in a browser. No install, no build step.

Files:
- `index.html`: the page (passage, input box, stats, result card).
- `style.css`: dark charcoal theme with lime and orange accents.
- `script.js`: the test logic.

How it works:
- A passage is picked at random from a short list. Click "New passage" for another one.
- The timer starts on your first key press.
- WPM = (correct characters / 5) / minutes elapsed.
- Accuracy = correct keystrokes / total keystrokes. Backspace does not count as a keystroke.
- The test finishes when the typed text matches the passage. Pasting is blocked.

Code shown in the video, in order: the page markup, the timer start, the WPM formula, the accuracy formula. The full code is in these files.
