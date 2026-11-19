# Expense Tracker (Mini Projects, Day 8)

An expense tracker with categories, a monthly summary, a budget bar, a donut chart, a six month bar chart, filters, rupee formatting and CSV export. Plain HTML, CSS and JavaScript, no libraries, no build step.

## Files

- `index.html` - the page: month bar, stats, summary, chart, list, dialogs
- `style.css` - the look, responsive layout and motion settings
- `script.js` - storage, demo data, charts, filters, dialogs and CSV export
- `README.md` - this file

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-08-expense-tracker/

Or open `index.html` in any modern browser.

## Features

- Add, edit and delete expenses with an amount, category, date and note
- Seven categories with their own colour and icon
- Delete shows an Undo button
- Month switcher, with total spent, daily average, entries and top category
- Monthly budget with a progress bar that turns amber and then red
- Donut chart by category and a six month bar chart, both clickable
- Search, category filter, sort, and a switch to show all months
- Amounts in Indian rupee format, like Rs 1,23,456
- Export the current view as a CSV file that opens cleanly in Excel and Sheets
- Everything is saved in this browser with localStorage
- Demo data is made up and loads on the first visit
- Works on phone, tablet, laptop, TV and 4K screens
- Respects the reduced motion setting

## Keyboard

| Key | Action |
| --- | --- |
| N | New expense |
| / | Search |
| Esc | Close a dialog |

## How it works

- Money is stored as whole paise (integers), so there are no floating point errors.
- The page reads `localStorage` once on load and writes after every change. Bad or missing data falls back to the demo set.
- The donut is one SVG circle per category, drawn with `stroke-dasharray`, so it animates when the numbers change.
- The CSV export follows the current filters. Cells starting with `=`, `+`, `-` or `@` get a leading quote so spreadsheets do not run them as formulas.
- Every note is added with `textContent`, never `innerHTML`.

## Notes

- Nothing is sent anywhere. Everything stays in the browser.
- Clear all removes your entries. Reset demo data brings the sample set back.
